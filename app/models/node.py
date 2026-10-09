from enum import Enum
from typing import List, Optional

from pydantic import ConfigDict, BaseModel, Field, model_validator


class NodeStatus(str, Enum):
    connected = "connected"
    connecting = "connecting"
    error = "error"
    disabled = "disabled"


class NodeSettings(BaseModel):
    min_node_version: str = "v0.2.0"
    certificate: str


class Node(BaseModel):
    name: str
    address: str
    port: int = 62050
    api_port: int = 62051
    usage_coefficient: float = Field(gt=0, default=1.0)


class NodeCreate(Node):
    # checked on the way in only: a stored node must always stay readable
    name: str = Field(min_length=1, max_length=256)
    address: str = Field(min_length=1, max_length=256)
    port: int = Field(62050, ge=1, le=65535)
    api_port: int = Field(62051, ge=1, le=65535)
    add_as_new_host: bool = True
    # which Xray core config the node runs, see app/xray/cores.py
    core_id: str = "main"
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "DE node",
            "address": "192.168.1.1",
            "port": 62050,
            "api_port": 62051,
            "add_as_new_host": True,
            "usage_coefficient": 1
        }
    })


class NodeModify(Node):
    name: Optional[str] = Field(None, nullable=True)
    address: Optional[str] = Field(None, nullable=True)
    port: Optional[int] = Field(None, nullable=True, ge=1, le=65535)
    api_port: Optional[int] = Field(None, nullable=True, ge=1, le=65535)
    status: Optional[NodeStatus] = Field(None, nullable=True)
    usage_coefficient: Optional[float] = Field(None, nullable=True)
    core_id: Optional[str] = Field(None, nullable=True)
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "DE node",
            "address": "192.168.1.1",
            "port": 62050,
            "api_port": 62051,
            "status": "disabled",
            "usage_coefficient": 1.0
        }
    })


class NodeResponse(Node):
    id: int
    xray_version: Optional[str] = None
    status: NodeStatus
    message: Optional[str] = None
    core_id: str = "main"
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def _fill_core(self):
        from app.xray import cores
        self.core_id = cores.core_of(self.id)
        return self


class NodeUsageResponse(BaseModel):
    node_id: Optional[int] = None
    node_name: str
    uplink: int
    downlink: int


class NodesUsageResponse(BaseModel):
    usages: List[NodeUsageResponse]
