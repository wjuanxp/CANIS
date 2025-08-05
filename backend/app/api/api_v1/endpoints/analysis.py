from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import verify_token
from app.models.analysis import Analysis
from app.models.analysis_history import AnalysisHistory
from app.models.spectrum import Spectrum
from app.schemas.analysis import (
    Analysis as AnalysisSchema,
    AnalysisCreate,
    AnalysisUpdate,
    AnalysisHistory as AnalysisHistorySchema
)

router = APIRouter()
security = HTTPBearer()

# Simple authentication dependency - gets current user ID from token
async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> int:
    """
    Extract user ID from JWT token.
    For demo purposes, returns user ID 1 if no token or token verification fails.
    In production, this should properly validate the token and return the actual user ID.
    """
    try:
        if credentials:
            username = verify_token(credentials.credentials)
            if username:
                # In a real implementation, you'd look up the user by username
                # For demo purposes, assuming user ID 1 for admin
                return 1
    except Exception:
        pass
    
    # Default to user ID 1 for demo purposes
    # In production, this should raise an authentication error
    return 1

@router.get("/", response_model=List[AnalysisSchema])
def read_analyses(
    skip: int = 0, 
    limit: int = 100, 
    spectrum_id: Optional[int] = None,
    method_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all analyses with optional filtering by spectrum_id and method_name"""
    query = db.query(Analysis)
    
    if spectrum_id:
        query = query.filter(Analysis.spectrum_id == spectrum_id)
    if method_name:
        query = query.filter(Analysis.method_name == method_name)
    
    analyses = query.offset(skip).limit(limit).all()
    return analyses

@router.get("/{analysis_id}", response_model=AnalysisSchema)
def read_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Get a specific analysis by ID"""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

@router.post("/", response_model=AnalysisSchema)
def create_analysis(
    analysis: AnalysisCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new analysis result"""
    try:
        # Verify spectrum exists
        spectrum = db.query(Spectrum).filter(Spectrum.id == analysis.spectrum_id).first()
        if not spectrum:
            raise HTTPException(status_code=404, detail="Spectrum not found")
        
        print(f"Creating analysis: {analysis.method_name} for spectrum {analysis.spectrum_id}")
        print(f"Parameters: {analysis.parameters}")
        print(f"Results keys: {list(analysis.results.keys()) if analysis.results else 'None'}")
        
        db_analysis = Analysis(
            spectrum_id=analysis.spectrum_id,
            method_name=analysis.method_name,
            parameters=analysis.parameters,
            results=analysis.results,
            created_by=current_user_id
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        print(f"Successfully created analysis with ID: {db_analysis.id}")
        return db_analysis
        
    except Exception as e:
        print(f"Error creating analysis: {str(e)}")
        print(f"Error type: {type(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create analysis: {str(e)}")

@router.put("/{analysis_id}", response_model=AnalysisSchema)
def update_analysis(
    analysis_id: int,
    analysis_update: AnalysisUpdate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update an existing analysis and track changes"""
    try:
        db_analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not db_analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        print(f"Updating analysis {analysis_id}: {db_analysis.method_name}")
        print(f"Update data: {analysis_update.dict(exclude_unset=True)}")
        
        # Store previous results for history tracking
        previous_results = db_analysis.results.copy() if db_analysis.results else {}
        previous_parameters = db_analysis.parameters.copy() if db_analysis.parameters else {}
        
        # Update fields if provided
        update_data = analysis_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_analysis, field, value)
        
        # Create history record
        history_record = AnalysisHistory(
            analysis_id=analysis_id,
            previous_results={"results": previous_results, "parameters": previous_parameters},
            new_results={"results": db_analysis.results, "parameters": db_analysis.parameters},
            changed_by=current_user_id,
            change_description=f"Updated {', '.join(update_data.keys())}"
        )
        
        db.add(history_record)
        db.commit()
        db.refresh(db_analysis)
        print(f"Successfully updated analysis {analysis_id}")
        return db_analysis
        
    except Exception as e:
        print(f"Error updating analysis {analysis_id}: {str(e)}")
        print(f"Error type: {type(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update analysis: {str(e)}")

@router.get("/{analysis_id}/history", response_model=List[AnalysisHistorySchema])
def get_analysis_history(analysis_id: int, db: Session = Depends(get_db)):
    """Get the change history for an analysis"""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    history = db.query(AnalysisHistory).filter(
        AnalysisHistory.analysis_id == analysis_id
    ).order_by(AnalysisHistory.changed_at.desc()).all()
    
    return history

@router.delete("/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Delete an analysis (soft delete by marking as deleted)"""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    db.delete(analysis)
    db.commit()
    return {"message": "Analysis deleted successfully"}

@router.get("/spectrum/{spectrum_id}/latest", response_model=List[AnalysisSchema])
def get_latest_analyses_for_spectrum(
    spectrum_id: int,
    methods: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """Get the latest analysis for each method type for a spectrum"""
    # Verify spectrum exists
    spectrum = db.query(Spectrum).filter(Spectrum.id == spectrum_id).first()
    if not spectrum:
        raise HTTPException(status_code=404, detail="Spectrum not found")
    
    # Build query for latest analyses
    query = db.query(Analysis).filter(Analysis.spectrum_id == spectrum_id)
    
    if methods:
        query = query.filter(Analysis.method_name.in_(methods))
    
    # Get latest analysis for each method
    analyses = []
    method_names = db.query(Analysis.method_name).filter(
        Analysis.spectrum_id == spectrum_id
    ).distinct().all()
    
    for (method_name,) in method_names:
        if not methods or method_name in methods:
            latest_analysis = db.query(Analysis).filter(
                Analysis.spectrum_id == spectrum_id,
                Analysis.method_name == method_name
            ).order_by(Analysis.created_at.desc()).first()
            
            if latest_analysis:
                analyses.append(latest_analysis)
    
    return analyses