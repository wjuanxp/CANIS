from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    previous_results = Column(JSON, default={})
    new_results = Column(JSON, default={})
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    change_description = Column(Text, nullable=True)

    # Relationships
    analysis = relationship("Analysis", back_populates="history")
    changed_by_user = relationship("User", back_populates="analysis_changes")