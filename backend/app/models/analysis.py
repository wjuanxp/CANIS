from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    spectrum_id = Column(Integer, ForeignKey("spectra.id"), nullable=False)
    method_name = Column(String, nullable=False)  # baseline_correction, peak_detection, etc.
    parameters = Column(JSON, default={})
    results = Column(JSON, default={})
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    spectrum = relationship("Spectrum", back_populates="analyses")
    created_by_user = relationship("User", back_populates="analyses")
    history = relationship("AnalysisHistory", back_populates="analysis", cascade="all, delete-orphan")