from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class AnalysisBase(BaseModel):
    method_name: str
    parameters: Dict[str, Any] = {}
    results: Dict[str, Any] = {}

class AnalysisCreate(AnalysisBase):
    spectrum_id: int

class AnalysisUpdate(BaseModel):
    parameters: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None

class AnalysisInDBBase(AnalysisBase):
    id: int
    spectrum_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class Analysis(AnalysisInDBBase):
    pass

class AnalysisInDB(AnalysisInDBBase):
    pass

# Specific schemas for peak detection results
class Peak(BaseModel):
    position: float
    intensity: float
    width: float
    prominence: float
    integrationArea: Optional[float] = None
    integrationStart: Optional[float] = None
    integrationEnd: Optional[float] = None
    manuallyAdjusted: bool = False

class PeakDetectionResult(BaseModel):
    peaks: List[Peak]
    parameters: Dict[str, Any]
    method: str = "peak_detection"

class BaselineCorrectionResult(BaseModel):
    corrected_intensities: List[float]
    baseline: List[float]
    parameters: Dict[str, Any]
    method: str = "baseline_correction"

# Analysis history for tracking changes
class AnalysisHistory(BaseModel):
    id: int
    analysis_id: int
    previous_results: Dict[str, Any]
    new_results: Dict[str, Any]
    changed_by: int
    changed_at: datetime
    change_description: str

    class Config:
        from_attributes = True