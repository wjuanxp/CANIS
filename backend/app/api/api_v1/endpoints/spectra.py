from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.spectrum import Spectrum
from app.models.sample import Sample
from app.schemas.spectrum import SpectrumResponse, SpectrumCreate, FileUploadResponse
from app.utils.file_parsers import SpectralFileParser
import io
import json

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

@router.post("/debug-upload")
async def debug_upload_spectrum_file(
    file: UploadFile = File(...),
    sample_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Debug version of upload endpoint to see parsing details"""
    
    content = await file.read()
    
    try:
        # Parse the spectral file
        wavelengths, intensities, metadata, technique = SpectralFileParser.parse_spectrum_file(
            content, file.filename
        )
        
        return {
            "filename": file.filename,
            "detected_technique": technique,
            "metadata": metadata,
            "data_points": len(wavelengths),
            "wavelength_range": [min(wavelengths), max(wavelengths)] if wavelengths else None
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "filename": file.filename
        }

@router.post("/upload", response_model=FileUploadResponse)
async def upload_spectrum_file(
    file: UploadFile = File(...),
    sample_id: int = Form(...),
    manual_technique: Optional[str] = Form(None),
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
        
        # Use manual technique if provided and auto-detection failed
        if manual_technique and technique == "Unknown":
            technique = manual_technique
            metadata["manual_technique_override"] = True
        elif manual_technique and technique != "Unknown":
            # Log that user provided manual technique but auto-detection worked
            metadata["manual_technique_provided"] = manual_technique
            metadata["auto_detected_technique"] = technique
        
        # Validate technique if manually provided
        if manual_technique:
            valid_techniques = ["IR", "Raman", "UV-Vis", "LIBS", "XRF", "NMR", "MS", "Unknown"]
            if manual_technique not in valid_techniques:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid technique. Must be one of: {', '.join(valid_techniques)}"
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

@router.get("/{spectrum_id}/export")
def export_spectrum(
    spectrum_id: int, 
    format: str = "jcamp",
    db: Session = Depends(get_db)
):
    """Export a spectrum in specified format (csv, jcamp, json)"""
    spectrum = db.query(Spectrum).filter(Spectrum.id == spectrum_id).first()
    if not spectrum:
        raise HTTPException(status_code=404, detail="Spectrum not found")
    
    format = format.lower()
    if format not in ["csv", "jcamp", "json"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid format. Supported formats: csv, jcamp, json"
        )
    
    filename = f"{spectrum.filename.rsplit('.', 1)[0]}.{format}"
    
    if format == "csv":
        # Export as CSV
        content = "wavelength,intensity\n"
        for w, i in zip(spectrum.wavelengths, spectrum.intensities):
            content += f"{w},{i}\n"
        
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    elif format == "json":
        # Export as JSON
        data = {
            "filename": spectrum.filename,
            "technique": spectrum.technique,
            "sample_id": spectrum.sample_id,
            "wavelengths": spectrum.wavelengths,
            "intensities": spectrum.intensities,
            "acquisition_parameters": spectrum.acquisition_parameters,
            "created_at": spectrum.created_at.isoformat() if spectrum.created_at else None
        }
        
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    elif format == "jcamp":
        # Export as JCAMP-DX
        metadata = spectrum.acquisition_parameters or {}
        
        # Build JCAMP-DX content
        jcamp_content = []
        jcamp_content.append("##TITLE= " + (metadata.get("title", spectrum.filename) or spectrum.filename))
        jcamp_content.append("##JCAMP-DX= 4.24")
        
        # Determine data type from technique
        data_type_map = {
            "IR": "INFRARED SPECTRUM",
            "Raman": "RAMAN SPECTRUM", 
            "UV-Vis": "UV/VIS SPECTRUM",
            "LIBS": "EMISSION SPECTRUM",
            "XRF": "X-RAY FLUORESCENCE SPECTRUM",
            "NMR": "NMR SPECTRUM",
            "MS": "MASS SPECTRUM"
        }
        data_type = data_type_map.get(spectrum.technique, "SPECTRUM")
        jcamp_content.append(f"##DATA TYPE= {data_type}")
        
        # Add metadata fields
        jcamp_content.append("##ORIGIN= " + (metadata.get("origin", "Spectral Analysis Platform") or "Spectral Analysis Platform"))
        jcamp_content.append("##OWNER= " + (metadata.get("owner", "User") or "User"))
        
        # Units based on technique
        if spectrum.technique == "IR":
            xunits = "1/CM"
            yunits = metadata.get("yunits", "TRANSMITTANCE") or "TRANSMITTANCE"
        elif spectrum.technique == "Raman":
            xunits = "1/CM"  
            yunits = "INTENSITY"
        elif spectrum.technique == "UV-Vis":
            xunits = "NANOMETERS"
            yunits = "ABSORBANCE"
        else:
            xunits = metadata.get("xunits", "X-UNITS") or "X-UNITS"
            yunits = metadata.get("yunits", "Y-UNITS") or "Y-UNITS"
            
        jcamp_content.append(f"##XUNITS= {xunits}")
        jcamp_content.append(f"##YUNITS= {yunits}")
        
        # Data range
        if spectrum.wavelengths:
            jcamp_content.append(f"##FIRSTX= {min(spectrum.wavelengths)}")
            jcamp_content.append(f"##LASTX= {max(spectrum.wavelengths)}")
            jcamp_content.append(f"##NPOINTS= {len(spectrum.wavelengths)}")
        
        # Data section
        jcamp_content.append("##XYDATA= (X++(Y..Y))")
        for w, i in zip(spectrum.wavelengths, spectrum.intensities):
            jcamp_content.append(f"{w} {i}")
        
        jcamp_content.append("##END=")
        
        content = "\n".join(jcamp_content)
        
        return Response(
            content=content,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )