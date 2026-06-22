from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Optional

class EndpointParam(BaseModel):
    name: str
    rule: str          # e.g. "required|integer|min:1"
    location: str      # "body", "query", "path"

class Endpoint(BaseModel):
    method: str                          # GET, POST, PUT, DELETE, PATCH
    path: str                            # /api/orders
    auth_required: bool = False
    auth_type: Optional[str] = None      # "bearer", "session", None
    request_body: dict = {}              # field_name -> validation rule
    path_params: list[str] = []          # ["id", "slug"]
    query_params: list[str] = []
    expected_response_codes: list[int] = [200]
    description: str = ""

class EndpointMap(BaseModel):
    framework: str
    base_url: str
    endpoints: list[Endpoint]
    total_count: int

class BaseParser(ABC):
    def __init__(self, project_path: str, base_url: str):
        self.project_path = project_path
        self.base_url = base_url

    @abstractmethod
    def parse(self) -> EndpointMap:
        """Parse the codebase and return standardised EndpointMap"""
        pass
