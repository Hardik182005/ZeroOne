from pydantic import BaseModel
from typing import List

class SectorItem(BaseModel):
    name: str
    change: float
    fii_flow: int
    dii_flow: int
    top_stock: str

class SectorFlowResponse(BaseModel):
    sectors: List[SectorItem]
    fii_total: int
    dii_total: int
