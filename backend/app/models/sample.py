from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    sample_id = Column(String, nullable=False)  # User-defined sample ID
    name = Column(String, nullable=False)
    description = Column(String)
    sample_type = Column(String)
    sample_metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="samples")
    spectra = relationship("Spectrum", back_populates="sample", cascade="all, delete-orphan")