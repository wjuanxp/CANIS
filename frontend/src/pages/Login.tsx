import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import { useAuthStore, useNotificationStore } from '../services/store';
import { useFormValidation } from '../hooks';

interface LoginFormData {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const validationRules = {
    username: (value: string) => {
      if (!value) return 'Username is required';
      if (value.length < 3) return 'Username must be at least 3 characters';
      return null;
    },
    password: (value: string) => {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must be at least 6 characters';
      return null;
    },
  };

  const {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setFieldTouched,
    validate,
  } = useFormValidation<LoginFormData>(
    { username: '', password: '' },
    validationRules
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      addNotification({
        type: 'error',
        message: 'Please fix the errors before submitting',
      });
      return;
    }

    setLoading(true);
    try {
      await login(values.username, values.password);
      addNotification({
        type: 'success',
        message: 'Successfully logged in',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.message || 'Login failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValue(field, e.target.value);
  };

  const handleFieldBlur = (field: keyof LoginFormData) => () => {
    setFieldTouched(field);
    validate(field);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', mt: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              OAP Login
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Open Analytical Platform
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={values.username}
                onChange={handleFieldChange('username')}
                onBlur={handleFieldBlur('username')}
                error={touched.username && !!errors.username}
                helperText={touched.username && errors.username}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={values.password}
                onChange={handleFieldChange('password')}
                onBlur={handleFieldBlur('password')}
                error={touched.password && !!errors.password}
                helperText={touched.password && errors.password}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading || !isValid}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>

              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Demo Credentials:</strong><br />
                    Username: admin<br />
                    Password: admin123
                  </Typography>
                </Alert>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;