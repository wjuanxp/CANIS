import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Snackbar, Alert } from '@mui/material';
import { useAuthStore, useUIStore, useNotificationStore } from './services/store';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Samples from './pages/Samples';
import Spectra from './pages/Spectra';
import Analysis from './pages/Analysis';
import Login from './pages/Login';

const App: React.FC = () => {
  const { isAuthenticated, loadUser } = useAuthStore();
  const { theme, sidebarOpen } = useUIStore();
  const { notifications, removeNotification } = useNotificationStore();

  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
        typography: {
          body1: {
            fontSize: '24px',
          },
          body2: {
            fontSize: '20px',
          },
          h6: {
            fontSize: '24px',
          },
          subtitle1: {
            fontSize: '24px',
          },
          subtitle2: {
            fontSize: '22px',
          },
          caption: {
            fontSize: '16px',
          },
        },
      }),
    [theme]
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Full-screen Analysis page */}
          <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
          
          {/* Main layout with sidebar for other pages */}
          <Route path="*" element={
            <Box sx={{ display: 'flex' }}>
              <Header />
              <Sidebar />
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  p: 3,
                  mt: 8,
                  ml: sidebarOpen ? 30 : 8,
                  transition: 'margin 0.3s ease',
                }}
              >
                <Routes>
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                  <Route path="/samples" element={<ProtectedRoute><Samples /></ProtectedRoute>} />
                  <Route path="/spectra" element={<ProtectedRoute><Spectra /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Box>
            </Box>
          } />
        </Routes>

        {/* Notifications */}
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={true}
            autoHideDuration={notification.duration || 5000}
            onClose={() => removeNotification(notification.id)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              onClose={() => removeNotification(notification.id)}
              severity={notification.type}
              variant="filled"
            >
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </Router>
    </ThemeProvider>
  );
};

export default App;