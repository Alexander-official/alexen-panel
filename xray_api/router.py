import ipaddress
import typing

import grpc

from .base import XRayBase
from .exceptions import RelatedError
from .proto.app.router import config_pb2
from .proto.app.router.command import command_pb2, command_pb2_grpc
from .proto.common.geodata import geodat_pb2
from .proto.common.serial.typed_message_pb2 import TypedMessage
from .types.message import Message


def _ip_rule(ip: str) -> geodat_pb2.IPRule:
    address = ipaddress.ip_address(ip)
    cidr = geodat_pb2.CIDR(ip=address.packed, prefix=address.max_prefixlen)
    return geodat_pb2.IPRule(custom=geodat_pb2.CIDRRule(cidr=cidr))


# Xray changed the source IP field of a routing rule (field 11) in v26.4.13: before it a
# GeoIP {cidr: [CIDR]}, from then an IPRule {custom: CIDRRule {cidr}}. Each reads the other
# wrong: the new form on an old core matches nothing (the IP limit does nothing there), the
# old form on a new core reads as "reverse match" and would match every IP. So a rule is
# encoded for the core's version; an unknown version gets the new form (the harmless miss).
IPRULE_SINCE = (26, 4, 13)


def legacy_geoip(version: typing.Optional[str]) -> bool:
    """the core reads source IPs the pre-v26.4.13 way"""
    try:
        parts = tuple(int(p) for p in str(version).strip().lstrip("v").split(".")[:3])
    except (TypeError, ValueError):
        return False
    return len(parts) == 3 and parts < IPRULE_SINCE


def _varint(n: int) -> bytes:
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def _field(number: int, payload: bytes) -> bytes:
    """a length-delimited protobuf field"""
    return _varint(number << 3 | 2) + _varint(len(payload)) + payload


def _legacy_source(ip: str) -> bytes:
    """field 11 the old way: GeoIP { cidr (2): CIDR { ip, prefix } }"""
    address = ipaddress.ip_address(ip)
    cidr = geodat_pb2.CIDR(ip=address.packed, prefix=address.max_prefixlen).SerializeToString()
    return _field(11, _field(2, cidr))


class Router(XRayBase):
    def add_rule(self,
                 rule_tag: str,
                 outbound_tag: str,
                 user_emails: typing.Iterable[str] = (),
                 source_ips: typing.Iterable[str] = (),
                 timeout: int = None,
                 legacy: bool = False) -> bool:
        """Appends a routing rule to the running core (Xray only supports appending at the end);
        legacy: a core before v26.4.13 (see legacy_geoip)"""
        source_ips = list(source_ips)
        rule = config_pb2.RoutingRule(
            tag=outbound_tag,
            rule_tag=rule_tag,
            user_email=list(user_emails),
            source_ip=[] if legacy else [_ip_rule(ip) for ip in source_ips],
        )
        if legacy:
            raw = rule.SerializeToString() + b"".join(_legacy_source(ip) for ip in source_ips)
            config = TypedMessage(type=config_pb2.Config.DESCRIPTOR.full_name, value=_field(2, raw))
        else:
            config = Message(config_pb2.Config(rule=[rule]))
        stub = command_pb2_grpc.RoutingServiceStub(self._channel)
        try:
            stub.AddRule(command_pb2.AddRuleRequest(config=config, shouldAppend=True), timeout=timeout)
            return True
        except grpc.RpcError as e:
            raise RelatedError(e)

    def remove_rule(self, rule_tag: str, timeout: int = None) -> bool:
        stub = command_pb2_grpc.RoutingServiceStub(self._channel)
        try:
            stub.RemoveRule(command_pb2.RemoveRuleRequest(ruleTag=rule_tag), timeout=timeout)
            return True
        except grpc.RpcError as e:
            raise RelatedError(e)
