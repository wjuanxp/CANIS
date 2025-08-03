# Open Analytical Platform (OAP)

An open-source chemical analytical data management and analysis platform designed for spectroscopic data (UV-Vis, Raman, LIBS, IR, X-ray).

## Features

### Core Functionality
- **Modern Web Interface**: React + TypeScript with Material-UI components
- **REST API**: High-performance FastAPI backend with SQLAlchemy ORM
- **Multi-technique Support**: UV-Vis, IR, Raman, LIBS, X-ray spectroscopy with automatic detection
- **Data Management**: Project-based organization with samples and spectra hierarchy
- **File Format Support**: JCAMP-DX, CSV, and other analytical data formats
- **Responsive Design**: Optimized for desktop and mobile devices

### Data Management
- **Project Management**: Create, edit, and delete projects with sample/spectra counts
- **Sample Management**: Organize samples within projects with metadata tracking
- **Spectrum Management**: Upload, view, and manage spectroscopic data
- **File Upload**: Drag-and-drop file upload with format validation and duplicate detection
- **Comprehensive Search**: Search across all metadata fields, filenames, techniques, and dates

### Visualization & Analysis
- **Interactive Spectral Viewer**: Landscape-oriented plots optimized for spectroscopic data
- **Technique-Specific Plotting**: Automatic axis labeling based on spectroscopic technique
- **Metadata Display**: Complete metadata extraction and display from uploaded files
- **Real-time Visualization**: Responsive plotting with zoom, pan, and export capabilities

### Technical Features
- **Robust File Parsing**: Advanced JCAMP-DX parser with error handling
- **Automatic Technique Detection**: Smart algorithm to identify spectroscopic technique
- **Data Validation**: Comprehensive input validation and error reporting
- **Performance Optimized**: Efficient data handling for large spectral datasets

## Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - SQL toolkit and ORM  
- **PostgreSQL/SQLite** - Database support (development uses SQLite)
- **Alembic** - Database migration tool
- **NumPy/SciPy** - Scientific computing and data processing
- **JCAMP** - JCAMP-DX file format parser
- **Pydantic** - Data validation and serialization

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe JavaScript development
- **Material-UI (MUI)** - Comprehensive React component library
- **Plotly.js** - Interactive scientific plotting and visualization
- **React Context** - State management for global application state

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

### Phase 1 (Completed ✅)
- ✅ **Project Management**: Full CRUD operations for projects with metadata
- ✅ **Sample Management**: Complete sample organization within projects  
- ✅ **Spectrum Management**: Upload, view, and manage spectroscopic data
- ✅ **File Upload System**: Drag-and-drop with validation and duplicate detection
- ✅ **JCAMP-DX Parser**: Robust parsing with error handling and metadata extraction
- ✅ **Interactive Visualization**: Landscape-oriented spectral viewer with technique-specific labeling
- ✅ **Search Functionality**: Comprehensive search across all metadata and properties
- ✅ **React Frontend**: Complete Material-UI interface with responsive design
- ✅ **FastAPI Backend**: High-performance API with SQLAlchemy ORM

### Phase 2 (Next)
- 🔄 **Advanced Analytics**: PLS regression, multivariate analysis, peak detection
- 🔄 **User Authentication**: JWT-based authentication and role-based access control
- 🔄 **Batch Processing**: Multiple file upload and batch analysis capabilities
- 🔄 **Export Features**: PDF reports, data export in multiple formats
- 🔄 **Performance Optimization**: Caching, database indexing, and query optimization

### Phase 3 (Future)
- 📋 **Plugin Architecture**: Extensible analysis methods and custom algorithms
- 📋 **Instrument Integration**: Direct instrument communication and data acquisition
- 📋 **Cloud Deployment**: Docker containerization and cloud-native features
- 📋 **Mobile App**: Progressive Web App (PWA) for mobile access
- 📋 **Community Features**: User collaboration and data sharing capabilities

## Recent Updates

### Latest Features Added ✨
- **Enhanced Spectrum Viewer**: Landscape orientation with optimized layout for spectroscopic data
- **Comprehensive Search**: Search functionality across all metadata, filenames, techniques, and dates
- **JCAMP-DX Improvements**: Fixed NumPy array handling and improved error messages
- **Project Management**: Complete project lifecycle management with sample/spectra counts
- **Sample Organization**: Full sample management within project hierarchy
- **UI/UX Improvements**: Default tab selection, improved layouts, and better responsive design