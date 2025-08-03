from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class SpectrumBase(BaseModel):
    technique: str = Field(..., description="Spectroscopic technique (UV-Vis, IR, Raman, LIBS, X-ray)")
    filename: str = Field(..., description="Original filename")
    wavelengths: List[float] = Field(..., description="Array of wavelength/wavenumber values")
    intensities: List[float] = Field(..., description="Array of intensity values")
    acquisition_parameters: Optional[Dict[str, Any]] = Field(default={}, description="Instrument parameters")


class SpectrumCreate(SpectrumBase):
    sample_id: int = Field(..., description="ID of the associated sample")


class SpectrumUpdate(BaseModel):
    technique: Optional[str] = None
    filename: Optional[str] = None
    wavelengths: Optional[List[float]] = None
    intensities: Optional[List[float]] = None
    acquisition_parameters: Optional[Dict[str, Any]] = None


class SpectrumResponse(SpectrumBase):
    id: int
    sample_id: int
    file_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FileUploadResponse(BaseModel):
    success: bool
    message: str
    spectrum_id: Optional[int] = None
    filename: str
    technique: str
    data_points: int