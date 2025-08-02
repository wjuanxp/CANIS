from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Spectrum(Base):
    __tablename__ = "spectra"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    technique = Column(String, nullable=False)  # UV-Vis, IR, Raman, etc.
    filename = Column(String, nullable=False)
    wavelengths = Column(JSON, nullable=False)  # Array of float values stored as JSON
    intensities = Column(JSON, nullable=False)  # Array of float values stored as JSON
    acquisition_parameters = Column(JSON, default={})
    file_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sample = relationship("Sample", back_populates="spectra")
    analyses = relationship("Analysis", back_populates="spectrum", cascade="all, delete-orphan")