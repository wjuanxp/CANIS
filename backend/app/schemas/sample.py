from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class SampleBase(BaseModel):
    sample_id: str = Field(..., description="User-defined sample identifier")
    name: str = Field(..., description="Sample name")
    description: Optional[str] = Field(None, description="Sample description")
    sample_type: Optional[str] = Field(None, description="Type of sample (e.g., solution, solid, gas)")
    sample_metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional sample metadata")


class SampleCreate(SampleBase):
    project_id: int = Field(..., description="ID of the associated project")


class SampleUpdate(BaseModel):
    sample_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sample_type: Optional[str] = None
    sample_metadata: Optional[Dict[str, Any]] = None


class SampleResponse(SampleBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SampleWithSpectraCount(SampleResponse):
    spectra_count: int = Field(description="Number of spectra associated with this sample")