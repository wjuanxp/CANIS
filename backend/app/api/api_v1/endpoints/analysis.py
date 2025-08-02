from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.analysis import Analysis

router = APIRouter()

@router.get("/")
def read_analyses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    analyses = db.query(Analysis).offset(skip).limit(limit).all()
    return analyses

@router.get("/{analysis_id}")
def read_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis