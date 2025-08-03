from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.spectrum import Spectrum
from app.models.sample import Sample
from app.schemas.spectrum import SpectrumResponse, SpectrumCreate, FileUploadResponse
from app.utils.file_parsers import SpectralFileParser

router = APIRouter()

@router.get("/", response_model=List[SpectrumResponse])
def read_spectra(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all spectra with pagination"""
    spectra = db.query(Spectrum).offset(skip).limit(limit).all()
    return spectra

@router.get("/{spectrum_id}", response_model=SpectrumResponse)
def read_spectrum(spectrum_id: int, db: Session = Depends(get_db)):
    """Get a specific spectrum by ID"""
    spectrum = db.query(Spectrum).filter(Spectrum.id == spectrum_id).first()
    if spectrum is None:
        raise HTTPException(status_code=404, detail="Spectrum not found")
    return spectrum

@router.post("/upload", response_model=FileUploadResponse)
async def upload_spectrum_file(
    file: UploadFile = File(...),
    sample_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Upload and parse a spectral data file"""
    
    # Validate sample exists
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Validate file type
    allowed_extensions = {'.csv', '.dx', '.jdx', '.jcamp', '.txt'}
    file_extension = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Check file size (limit to 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    
    try:
        # Parse the spectral file
        wavelengths, intensities, metadata, technique = SpectralFileParser.parse_spectrum_file(
            content, file.filename
        )
        
        # Check if spectrum with same hash already exists
        file_hash = metadata.get('file_hash')
        existing_spectrum = db.query(Spectrum).filter(Spectrum.file_hash == file_hash).first()
        if existing_spectrum:
            raise HTTPException(
                status_code=400, 
                detail=f"Spectrum already exists (ID: {existing_spectrum.id})"
            )
        
        # Create new spectrum record
        new_spectrum = Spectrum(
            sample_id=sample_id,
            technique=technique,
            filename=file.filename,
            wavelengths=wavelengths,
            intensities=intensities,
            acquisition_parameters=metadata,
            file_hash=file_hash
        )
        
        db.add(new_spectrum)
        db.commit()
        db.refresh(new_spectrum)
        
        return FileUploadResponse(
            success=True,
            message="File uploaded and processed successfully",
            spectrum_id=new_spectrum.id,
            filename=file.filename,
            technique=technique,
            data_points=len(wavelengths)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/", response_model=SpectrumResponse)
def create_spectrum(spectrum: SpectrumCreate, db: Session = Depends(get_db)):
    """Create a new spectrum manually (for programmatic data entry)"""
    
    # Validate sample exists
    sample = db.query(Sample).filter(Sample.id == spectrum.sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Validate data arrays have same length
    if len(spectrum.wavelengths) != len(spectrum.intensities):
        raise HTTPException(
            status_code=400, 
            detail="Wavelengths and intensities arrays must have the same length"
        )
    
    db_spectrum = Spectrum(**spectrum.model_dump())
    db.add(db_spectrum)
    db.commit()
    db.refresh(db_spectrum)
    
    return db_spectrum

@router.delete("/{spectrum_id}")
def delete_spectrum(spectrum_id: int, db: Session = Depends(get_db)):
    """Delete a spectrum"""
    spectrum = db.query(Spectrum).filter(Spectrum.id == spectrum_id).first()
    if not spectrum:
        raise HTTPException(status_code=404, detail="Spectrum not found")
    
    db.delete(spectrum)
    db.commit()
    
    return {"success": True, "message": "Spectrum deleted successfully"}