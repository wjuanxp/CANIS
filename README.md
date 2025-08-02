# Open Analytical Platform (OAP)

An open-source chemical analytical data management and analysis platform designed for spectroscopic data (UV-Vis, Raman, LIBS, IR, X-ray).

## Features

- **Modern Web Interface**: React + TypeScript with Material-UI
- **REST API**: FastAPI backend with SQLAlchemy ORM
- **Multi-technique Support**: UV-Vis, IR, Raman, LIBS, X-ray spectroscopy
- **Data Management**: Project-based organization with samples and spectra
- **Analysis Tools**: Built-in spectroscopic analysis algorithms
- **File Format Support**: JCAMP-DX, CSV, and manufacturer formats
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **PostgreSQL** - Primary database
- **Alembic** - Database migration tool
- **NumPy/SciPy** - Scientific computing
- **Plotly** - Interactive visualizations

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - React component library
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 16+
- Docker & Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CANIS
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Database Services

```bash
docker-compose up -d postgres redis
```

Wait for PostgreSQL to be ready (check with `docker-compose logs postgres`).

### 4. Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

### 5. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The web interface will be available at http://localhost:3000

## Development Workflow

### Backend Development

```bash
cd backend
source venv/bin/activate

# Run tests
pytest

# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Start server with auto-reload
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Database Management

```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose down

# Reset database (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d postgres
cd backend && alembic upgrade head
```

## Project Structure

```
CANIS/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration and database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── analysis/       # Analysis algorithms
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   ├── tests/             # Backend tests
│   └── requirements.txt   # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript types
│   ├── public/            # Static assets
│   └── package.json       # Node.js dependencies
├── docker-compose.yml     # Development services
└── README.md              # This file
```

## API Documentation

Once the backend is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

## Testing

### Backend Tests

```bash
cd backend
pytest                     # Run all tests
pytest tests/test_main.py  # Run specific test file
pytest -v                 # Verbose output
pytest --cov              # With coverage report
```

### Frontend Tests

```bash
cd frontend
npm test                   # Run tests in watch mode
npm test -- --coverage    # Run with coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions via GitHub Discussions
- **Documentation**: Comprehensive docs available in the `/docs` directory

## Roadmap

See [CLAUDE.md](CLAUDE.md) for detailed project roadmap and technical specifications.

### Phase 1 (Current)
- ✅ Basic project structure
- ✅ Database models and API endpoints
- ✅ React frontend with Material-UI
- 🚧 File upload and spectral data visualization
- 🚧 Basic analysis algorithms

### Phase 2
- Multi-technique support
- Advanced analytics
- User management
- Performance optimization

### Phase 3
- Community features
- Plugin architecture
- Mobile app
- Cloud deployment