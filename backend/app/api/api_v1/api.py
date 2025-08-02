from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, projects, samples, spectra, analysis

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(samples.router, prefix="/samples", tags=["samples"])
api_router.include_router(spectra.router, prefix="/spectra", tags=["spectra"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])