from . import exceptions
from . import exceptions as exc
from . import types
from .proxyman import Proxyman
from .router import Router
from .stats import Stats


class XRay(Proxyman, Router, Stats):
    pass


__all__ = [
    "XRay",
    "exceptions",
    "exc",
    "types"
]
