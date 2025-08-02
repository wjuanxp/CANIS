# OAP Frontend

React-based frontend for the Open Analytical Platform (OAP).

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **Plotly.js** for scientific data visualization
- **Zustand** for state management
- **Axios** for HTTP requests
- **React Router** for navigation

## Project Structure

```
src/
├── components/        # Reusable React components
├── pages/            # Main application pages  
├── hooks/            # Custom React hooks
├── services/         # API client and state management
├── utils/            # Helper functions
├── types/            # TypeScript type definitions
└── App.tsx           # Main application component
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm 8+

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm start
```

The application will open at http://localhost:3000

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App

## Configuration

Environment variables can be configured in `.env`:

- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:8000)

## Features Implemented

### Core Infrastructure
- ✅ React app setup with TypeScript
- ✅ Material-UI theming and components
- ✅ Routing with React Router
- ✅ State management with Zustand
- ✅ API service layer with Axios
- ✅ Comprehensive TypeScript types
- ✅ Custom React hooks
- ✅ Utility functions
- ✅ Error handling and notifications

### Authentication
- ✅ Login page with form validation
- ✅ JWT token management
- ✅ Route protection
- ✅ User session management

### UI Components
- ✅ Responsive layout with sidebar
- ✅ Theme switching (light/dark)
- ✅ Notification system
- ✅ Header and navigation

### Data Management
- ✅ Project management store
- ✅ Sample management store
- ✅ Spectrum management store
- ✅ Analysis management store
- ✅ File upload handling

### Analysis Tools
- ✅ Spectral data processing hooks
- ✅ Peak detection algorithms
- ✅ Baseline correction
- ✅ Data smoothing and normalization
- ✅ JCAMP-DX and CSV parsing

## Development Guidelines

### Code Style
- Use functional components with hooks
- Follow TypeScript best practices
- Use Material-UI components consistently
- Implement proper error handling
- Write clear, descriptive component names

### State Management
- Use Zustand stores for global state
- Keep component state minimal
- Use custom hooks for complex logic
- Implement proper loading states

### API Integration
- Use the centralized API service
- Handle errors gracefully
- Show loading indicators
- Cache data when appropriate

## Testing

The frontend uses Jest and React Testing Library for testing:

```bash
npm test
```

## Building for Production

Create a production build:

```bash
npm run build
```

The build artifacts will be in the `build/` directory.

## Deployment

The frontend can be deployed to any static hosting service:

- Netlify
- Vercel
- AWS S3 + CloudFront
- Firebase Hosting

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Use semantic commit messages

## Architecture Decisions

### Why Zustand over Redux?
- Simpler API with less boilerplate
- Better TypeScript support
- Smaller bundle size
- Easier to set up and maintain

### Why Material-UI?
- Comprehensive component library
- Excellent accessibility support
- Professional appearance out of the box
- Good documentation and community

### Why Plotly.js?
- Excellent for scientific data visualization
- Interactive charts with zoom/pan
- Supports multiple chart types
- Good performance with large datasets