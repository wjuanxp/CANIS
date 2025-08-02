from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User

router = APIRouter()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    username = verify_token(credentials.credentials)
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # For demo purposes, return hardcoded admin user
    if username == "admin":
        return {
            "id": "1",
            "username": "admin",
            "email": "admin@example.com",
            "role": "admin",
            "created_at": "2024-01-01T00:00:00Z"
        }
    
    raise HTTPException(status_code=404, detail="User not found")

@router.get("/me")
def read_current_user(current_user = Depends(get_current_user)):
    return current_user

@router.get("/")
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user