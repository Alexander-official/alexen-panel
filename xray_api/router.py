import ipaddress
import typing

import grpc

from .base import XRayBase
from .exceptions import RelatedError
from .proto.app.router import config_pb2
from .proto.app.router.command import command_pb2, command_pb2_grpc
from .proto.common.geodata import geodat_pb2
from .types.message import Message


def _ip_rule(ip: str) -> geodat_pb2.IPRule:
    address = ipaddress.ip_address(ip)
    cidr = geodat_pb2.CIDR(ip=address.packed, prefix=address.max_prefixlen)
    return geodat_pb2.IPRule(custom=geodat_pb2.CIDRRule(cidr=cidr))


class Router(XRayBase):
    def add_rule(self,
                 rule_tag: str,
                 outbound_tag: str,
                 user_emails: typing.Iterable[str] = (),
                 source_ips: typing.Iterable[str] = (),
                 timeout: int = None) -> bool:
        """Appends a routing rule to the running core (Xray only supports appending at the end)"""
        rule = config_pb2.RoutingRule(
            tag=outbound_tag,
            rule_tag=rule_tag,
            user_email=list(user_emails),
            source_ip=[_ip_rule(ip) for ip in source_ips],
        )
        stub = command_pb2_grpc.RoutingServiceStub(self._channel)
        try:
            stub.AddRule(command_pb2.AddRuleRequest(config=Message(config_pb2.Config(rule=[rule])),
                                                    shouldAppend=True), timeout=timeout)
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
