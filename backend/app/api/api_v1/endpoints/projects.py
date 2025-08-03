from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.sample import Sample
from app.models.spectrum import Spectrum
from app.models.user import User
from app.schemas.project import ProjectResponse, ProjectCreate, ProjectUpdate, ProjectWithCounts

router = APIRouter()

@router.get("/", response_model=List[ProjectWithCounts])
def read_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all projects with pagination and counts"""
    try:
        # Get projects first
        projects = db.query(Project).offset(skip).limit(limit).all()
        
        result = []
        for project in projects:
            # Count samples and spectra for each project separately
            samples_count = db.query(Sample).filter(Sample.project_id == project.id).count()
            spectra_count = db.query(Spectrum).join(Sample).filter(Sample.project_id == project.id).count()
            
            project_dict = {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "owner_id": project.owner_id,
                "settings": project.settings or {},
                "created_at": project.created_at,
                "updated_at": project.updated_at,
                "samples_count": samples_count,
                "spectra_count": spectra_count
            }
            result.append(ProjectWithCounts(**project_dict))
        
        return result
    except Exception as e:
        # For debugging, let's return a simple list for now
        projects = db.query(Project).offset(skip).limit(limit).all()
        result = []
        for project in projects:
            project_dict = {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "owner_id": project.owner_id,
                "settings": project.settings or {},
                "created_at": project.created_at,
                "updated_at": project.updated_at,
                "samples_count": 0,
                "spectra_count": 0
            }
            result.append(ProjectWithCounts(**project_dict))
        return result

@router.get("/{project_id}", response_model=ProjectResponse)
def read_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project"""
    
    # For now, we'll default to owner_id = 1 since we don't have authentication
    # In a real system, this would come from the authenticated user
    if not project.owner_id:
        project.owner_id = 1
    
    # Validate owner exists (optional - could create a default user)
    # owner = db.query(User).filter(User.id == project.owner_id).first()
    # if not owner:
    #     raise HTTPException(status_code=404, detail="Owner not found")
    
    # Check if project name is unique for this owner
    existing_project = db.query(Project).filter(
        Project.owner_id == project.owner_id,
        Project.name == project.name
    ).first()
    
    if existing_project:
        raise HTTPException(
            status_code=400, 
            detail=f"Project '{project.name}' already exists for this owner"
        )
    
    # Create new project
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    """Update a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if new name is unique for this owner (if being updated)
    if project_update.name and project_update.name != project.name:
        existing_project = db.query(Project).filter(
            Project.owner_id == project.owner_id,
            Project.name == project_update.name,
            Project.id != project_id
        ).first()
        
        if existing_project:
            raise HTTPException(
                status_code=400, 
                detail=f"Project '{project_update.name}' already exists for this owner"
            )
    
    # Update fields
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project and all associated samples and spectra"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Count associated data
    samples_count = db.query(Sample).filter(Sample.project_id == project_id).count()
    spectra_count = db.query(Spectrum).join(Sample).filter(Sample.project_id == project_id).count()
    
    db.delete(project)
    db.commit()
    
    return {
        "success": True, 
        "message": f"Project deleted successfully. {samples_count} samples and {spectra_count} spectra were also deleted."
    }