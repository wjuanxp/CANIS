from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.spectrum import Spectrum

router = APIRouter()

@router.get("/")
def read_spectra(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    spectra = db.query(Spectrum).offset(skip).limit(limit).all()
    return spectra

@router.get("/{spectrum_id}")
def read_spectrum(spectrum_id: int, db: Session = Depends(get_db)):
    spectrum = db.query(Spectrum).filter(Spectrum.id == spectrum_id).first()
    if spectrum is None:
        raise HTTPException(status_code=404, detail="Spectrum not found")
    return spectrum