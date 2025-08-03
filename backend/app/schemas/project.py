from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ProjectBase(BaseModel):
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    settings: Optional[Dict[str, Any]] = Field(default={}, description="Project-specific settings")


class ProjectCreate(ProjectBase):
    owner_id: int = Field(..., description="ID of the project owner")


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectWithCounts(ProjectResponse):
    samples_count: int = Field(description="Number of samples in this project")
    spectra_count: int = Field(description="Total number of spectra across all samples in this project")