from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.models.sample import Sample
from app.models.project import Project
from app.models.spectrum import Spectrum
from app.schemas.sample import SampleResponse, SampleCreate, SampleUpdate, SampleWithSpectraCount

router = APIRouter()

@router.get("/", response_model=List[SampleWithSpectraCount])
def read_samples(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all samples with pagination and spectra count"""
    samples_query = db.query(
        Sample,
        func.count(Spectrum.id).label('spectra_count')
    ).outerjoin(Spectrum).group_by(Sample.id).offset(skip).limit(limit)
    
    samples_with_count = samples_query.all()
    
    result = []
    for sample, spectra_count in samples_with_count:
        sample_dict = {
            "id": sample.id,
            "project_id": sample.project_id,
            "sample_id": sample.sample_id,
            "name": sample.name,
            "description": sample.description,
            "sample_type": sample.sample_type,
            "sample_metadata": sample.sample_metadata or {},
            "created_at": sample.created_at,
            "spectra_count": spectra_count or 0
        }
        result.append(SampleWithSpectraCount(**sample_dict))
    
    return result

@router.get("/{sample_id}", response_model=SampleResponse)
def read_sample(sample_id: int, db: Session = Depends(get_db)):
    """Get a specific sample by ID"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample

@router.post("/", response_model=SampleResponse)
def create_sample(sample: SampleCreate, db: Session = Depends(get_db)):
    """Create a new sample"""
    
    # Validate project exists
    project = db.query(Project).filter(Project.id == sample.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if sample_id is unique within the project
    existing_sample = db.query(Sample).filter(
        Sample.project_id == sample.project_id,
        Sample.sample_id == sample.sample_id
    ).first()
    
    if existing_sample:
        raise HTTPException(
            status_code=400, 
            detail=f"Sample ID '{sample.sample_id}' already exists in this project"
        )
    
    # Create new sample
    db_sample = Sample(**sample.model_dump())
    db.add(db_sample)
    db.commit()
    db.refresh(db_sample)
    
    return db_sample

@router.put("/{sample_id}", response_model=SampleResponse)
def update_sample(sample_id: int, sample_update: SampleUpdate, db: Session = Depends(get_db)):
    """Update a sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Check if new sample_id is unique within the project (if being updated)
    if sample_update.sample_id and sample_update.sample_id != sample.sample_id:
        existing_sample = db.query(Sample).filter(
            Sample.project_id == sample.project_id,
            Sample.sample_id == sample_update.sample_id,
            Sample.id != sample_id
        ).first()
        
        if existing_sample:
            raise HTTPException(
                status_code=400, 
                detail=f"Sample ID '{sample_update.sample_id}' already exists in this project"
            )
    
    # Update fields
    update_data = sample_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sample, field, value)
    
    db.commit()
    db.refresh(sample)
    
    return sample

@router.delete("/{sample_id}")
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    """Delete a sample and all associated spectra"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Count associated spectra
    spectra_count = db.query(Spectrum).filter(Spectrum.sample_id == sample_id).count()
    
    db.delete(sample)
    db.commit()
    
    return {
        "success": True, 
        "message": f"Sample deleted successfully. {spectra_count} associated spectra were also deleted."
    }