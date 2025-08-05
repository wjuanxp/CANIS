# claude.md

## Project Overview

**Project Name**: Open Analytical Platform (OAP)
**Type**: Open-source chemical analytical data management and analysis platform
**Primary Developer**: Experienced chemoinformatics specialist (10+ years industry experience)
**Development Model**: Solo hobby project transitioning to community-driven open source
**Timeline**: 12-18 months to functional beta
**License**: MIT (to be confirmed)

## Project Vision & Goals

### Primary Vision
Create a modern, open-source alternative to expensive proprietary LIMS systems, specifically designed for analytical chemistry laboratories working with spectroscopic data (UV-Vis, Raman, LIBS, IR, X-ray).

### Core Goals
- **Accessibility**: Free, open-source alternative to $100K+ commercial LIMS systems
- **Modern Architecture**: Cloud-native design with responsive web interface
- **Scientific Focus**: Built by chemists, for chemists, with domain expertise embedded
- **Community-Driven**: Extensible platform encouraging community contributions
- **Standards Compliance**: Support for open data formats and analytical standards
- **Future Commercial Potential**: Foundation for potential SaaS offering

### Target Users
- **Primary**: Small to medium analytical chemistry laboratories
- **Secondary**: Academic research groups, quality control labs
- **Future**: Commercial laboratories seeking cost-effective LIMS solutions

## Technical Architecture

### Technology Stack

**Backend**:
- **Framework**: FastAPI (Python 3.11+) for high-performance APIs
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Scientific Computing**: NumPy, SciPy, pandas, scikit-learn
- **Task Processing**: Celery with Redis (future phases)
- **Authentication**: JWT tokens with role-based access control

**Frontend**:
- **Framework**: React 18+ with TypeScript
- **UI Library**: Material-UI (MUI) for consistent, professional appearance
- **Visualization**: Plotly.js for interactive scientific plots
- **State Management**: React Context API (expanding to Zustand if needed)
- **HTTP Client**: Axios for API communication

**Database Design**:
- **Core Tables**: users, projects, samples, spectra, analyses, methods
- **File Storage**: Local filesystem initially, S3-compatible later
- **Data Formats**: Support for JCAMP-DX, CSV, manufacturer formats

**Deployment**:
- **Development**: Local SQLite + Python dev server + React dev server
- **Production**: PostgreSQL + Docker containers + Railway/Render hosting
- **CI/CD**: GitHub Actions for testing and deployment

### Architecture Patterns

**Backend Patterns**:
- **Repository Pattern**: Data access abstraction layer
- **Service Layer**: Business logic separation from API endpoints
- **Factory Pattern**: Analysis algorithm selection and instantiation
- **Plugin Architecture**: Extensible analysis methods (future)

**Frontend Patterns**:
- **Component Composition**: Reusable UI components
- **Custom Hooks**: Shared state logic and API interactions
- **Error Boundaries**: Graceful error handling in React components
- **Lazy Loading**: Performance optimization for large datasets

## Domain Knowledge & Terminology

### Analytical Chemistry Concepts

**Spectroscopic Techniques**:
- **UV-Vis**: Ultraviolet-visible spectroscopy, wavelength 200-800nm
- **IR**: Infrared spectroscopy, wavenumber 4000-400 cm⁻¹
- **Raman**: Raman spectroscopy, Raman shift measurement
- **LIBS**: Laser-Induced Breakdown Spectroscopy, elemental analysis
- **X-ray**: X-ray elemental analysis (XRF, XRD)

**Data Processing Terms**:
- **Baseline Correction**: Removing background signal drift
- **Peak Detection**: Identifying local maxima in spectral data
- **Integration**: Calculating area under spectral peaks
- **Normalization**: Scaling spectra for comparison
- **Smoothing**: Noise reduction in spectral data
- **Calibration**: Relationship between signal and concentration

**File Formats**:
- **JCAMP-DX**: Standard format for analytical chemistry data exchange
- **CSV**: Simple comma-separated values for spectral data
- **Manufacturer Formats**: Proprietary formats from instrument vendors

### Business Domain

**Laboratory Workflow**:
1. **Sample Registration**: Unique ID, metadata, chain of custody
2. **Method Selection**: Analytical procedure specification
3. **Data Acquisition**: Instrument measurement and raw data capture
4. **Data Processing**: Analysis algorithms and result calculation
5. **Review & Approval**: Quality control and result validation
6. **Reporting**: Formatted output for stakeholders

**Compliance Concepts**:
- **Audit Trail**: Complete record of data changes and user actions
- **Data Integrity**: Ensuring data accuracy and preventing tampering
- **Method Validation**: Proving analytical method reliability
- **ISO 17025**: International standard for testing laboratory competence

## Development Guidelines

### Code Structure & Organization

**Backend Structure**:
```
backend/
├── app/
│   ├── api/              # FastAPI route definitions
│   ├── core/             # Configuration, security, database
│   ├── models/           # SQLAlchemy database models
│   ├── schemas/          # Pydantic request/response models
│   ├── services/         # Business logic layer
│   ├── analysis/         # Spectroscopic analysis algorithms
│   └── utils/            # Helper functions and utilities
├── tests/                # Pytest test suite
└── migrations/           # Alembic database migrations
```

**Frontend Structure**:
```
frontend/
├── src/
│   ├── components/       # Reusable React components
│   ├── pages/            # Main application pages
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API client and data fetching
│   ├── utils/            # Helper functions
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
└── tests/                # Jest/React Testing Library tests
```

### Coding Standards

**Python Standards**:
- **Style**: Follow PEP 8 with Black formatter
- **Type Hints**: Use type annotations throughout
- **Docstrings**: Google-style docstrings for all functions
- **Error Handling**: Explicit exception handling with custom exceptions
- **Testing**: Pytest with >80% coverage target

**TypeScript/React Standards**:
- **Style**: Prettier formatting with ESLint
- **Components**: Functional components with hooks
- **Props**: Explicit TypeScript interfaces for all props
- **State**: Minimize state complexity, prefer derived state
- **Testing**: React Testing Library for component tests

**Database Standards**:
- **Migrations**: All schema changes via Alembic migrations
- **Naming**: snake_case for tables/columns, descriptive names
- **Indexes**: Proper indexing for query performance
- **Constraints**: Use database constraints for data integrity

### Analysis Algorithm Guidelines

**Algorithm Implementation**:
- **Modularity**: Each algorithm as separate function/class
- **Parameters**: Configurable parameters with sensible defaults
- **Validation**: Input validation and error handling
- **Documentation**: Clear parameter descriptions and examples
- **Testing**: Unit tests with known reference data

**Performance Considerations**:
- **NumPy**: Vectorized operations over Python loops
- **Memory**: Efficient handling of large spectral datasets
- **Caching**: Cache expensive calculations when appropriate
- **Batch Processing**: Support for multiple spectra processing

## Development Phases & Milestones

### Phase 1: Foundation & MVP (Months 1-4)
**Goal**: Basic spectral data management with simple analysis

**Key Features**:
- User authentication and project management
- Spectral data import (JCAMP-DX, CSV)
- Basic visualization with Plotly.js
- Simple analysis tools (baseline correction, peak detection)
- File export functionality

**Success Criteria**:
- Can import and visualize 3+ file formats
- Basic analysis tools functional
- 5+ GitHub stars from community

### Phase 2: Advanced Features (Months 5-8)
**Goal**: Professional-grade analysis tools and multi-technique support

**Key Features**:
- Multi-technique support (UV-Vis, IR, Raman specifics)
- Advanced analytics (PLS regression, multivariate analysis)
- Calibration curve functionality
- User management and collaboration features
- Performance optimization

**Success Criteria**:
- Supports 3+ analytical techniques
- 10+ active users in demo instance
- 25+ GitHub stars

### Phase 3: Community & Quality (Months 9-12)
**Goal**: Build community, ensure quality, prepare for wider adoption

**Key Features**:
- Comprehensive testing and documentation
- Plugin architecture for extensibility
- Community engagement and contributor onboarding
- Beta release with selected users

**Success Criteria**:
- 80%+ test coverage
- 5+ community contributors
- 100+ GitHub stars
- v1.0 release

## API Design Principles

### RESTful API Design
- **Resources**: Clear noun-based endpoints (/api/v1/spectra)
- **HTTP Methods**: Proper use of GET, POST, PUT, DELETE
- **Status Codes**: Appropriate HTTP status codes
- **Pagination**: Consistent pagination for large datasets
- **Filtering**: Query parameters for data filtering and sorting

### Response Formats
```typescript
// Standard success response
{
  "success": true,
  "data": { /* actual data */ },
  "meta": { /* pagination, timestamps, etc. */ }
}

// Standard error response
{
  "success": false,
  "error": {
    "code": "INVALID_SPECTRUM_FORMAT",
    "message": "Unsupported file format",
    "details": { /* additional error info */ }
  }
}
```

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: User roles (admin, analyst, viewer)
- **Resource Permissions**: Project-level access control
- **API Keys**: Future support for programmatic access

## Data Models & Relationships

### Core Entities

**User**:
- id, username, email, password_hash
- role (admin, analyst, viewer)
- created_at, last_login

**Project**:
- id, name, description, owner_id
- created_at, updated_at
- settings (JSON for project-specific configuration)

**Sample**:
- id, project_id, sample_id (user-defined)
- name, description, sample_type
- metadata (JSON for flexible sample properties)

**Spectrum**:
- id, sample_id, technique, filename
- wavelengths (array), intensities (array)
- acquisition_parameters (JSON)
- created_at, file_hash

**Analysis**:
- id, spectrum_id, method_name
- parameters (JSON), results (JSON)
- created_by, created_at

### Relationships
- User → Projects (one-to-many, owned)
- Project → Samples (one-to-many)
- Sample → Spectra (one-to-many)
- Spectrum → Analyses (one-to-many)
- User ↔ Projects (many-to-many, shared access)

## File Format Support

### Priority 1 (MVP)
- **CSV**: Simple wavelength,intensity pairs
- **JCAMP-DX**: Industry standard format
- **JSON**: Native format for API responses

### Priority 2 (Advanced)
- **Manufacturer Formats**: Based on community needs
- **Excel**: Common in laboratory environments
- **XML**: For metadata-rich formats

### Export Formats
- **CSV**: Universal compatibility
- **JCAMP-DX**: Standard compliance
- **PDF**: Reports and visualizations
- **PNG/SVG**: Chart exports

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual functions and classes
- **Integration Tests**: API endpoints and database operations
- **Analysis Tests**: Algorithm accuracy with reference data
- **Performance Tests**: Large dataset handling

### Frontend Testing
- **Component Tests**: Individual React components
- **Integration Tests**: User workflows and API integration
- **Visual Tests**: Chart rendering and UI consistency
- **E2E Tests**: Critical user paths (future)

### Test Data
- **Reference Spectra**: Known standards for algorithm validation
- **Synthetic Data**: Generated test datasets
- **Real Data**: Anonymized laboratory data (with permission)

## Security Considerations

### Data Protection
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: Track all data modifications
- **Input Validation**: Prevent injection attacks

### Privacy
- **User Data**: Minimal collection, secure storage
- **Sample Data**: Customer data protection
- **Analytics**: Anonymous usage tracking only

## Performance Requirements

### Response Times
- **API Endpoints**: <200ms for simple queries
- **File Upload**: Progress indication for large files
- **Analysis**: <5 seconds for typical spectrum processing
- **Visualization**: <1 second for chart rendering

### Scalability
- **Database**: Efficient queries with proper indexing
- **File Storage**: Scalable storage strategy
- **Concurrent Users**: Support for 50+ simultaneous users
- **Data Volume**: Handle 10,000+ spectra per project

## Community & Contribution Guidelines

### Contribution Process
1. **Issues**: Bug reports and feature requests via GitHub Issues
2. **Discussions**: Community questions via GitHub Discussions
3. **Pull Requests**: Code contributions via GitHub PRs
4. **Documentation**: Improvements to docs and examples

### Code of Conduct
- **Inclusive**: Welcoming to all contributors
- **Professional**: Respectful communication
- **Collaborative**: Constructive feedback and support

### Recognition
- **Contributors**: Listed in README and releases
- **Major Contributors**: Special recognition and consultation
- **Community Leaders**: Maintainer status consideration

## Future Roadmap

### Short-term (6-12 months)
- Core functionality completion
- Community building
- Plugin architecture
- Mobile responsiveness

### Medium-term (1-2 years)
- Advanced AI/ML features
- Instrument integration
- Multi-laboratory support
- Commercial SaaS option

### Long-term (2+ years)
- IoT device integration
- Predictive analytics
- Regulatory compliance packages
- Enterprise features

## Deployment & Operations

### Development Environment
- **Local Setup**: Docker Compose for full stack
- **Database**: PostgreSQL via Docker
- **File Storage**: Local filesystem
- **Configuration**: Environment variables
- **Python Environment**: ALWAYS use virtual environment - activate with `source venv/bin/activate` before running any Python commands or scripts

### Production Environment
- **Hosting**: Railway.app or Render.com initially
- **Database**: Managed PostgreSQL
- **File Storage**: S3-compatible storage
- **Monitoring**: Basic uptime and error tracking

### CI/CD Pipeline
- **Testing**: Automated test suite on every commit
- **Building**: Docker image building
- **Deployment**: Automatic deployment on main branch
- **Releases**: Tagged releases with release notes

This document serves as a comprehensive guide for Claude to understand the project context, technical requirements, and development approach throughout the Open Analytical Platform development process.