from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.sample import Sample

router = APIRouter()

@router.get("/")
def read_samples(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    samples = db.query(Sample).offset(skip).limit(limit).all()
    return samples

@router.get("/{sample_id}")
def read_sample(sample_id: int, db: Session = Depends(get_db)):
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample