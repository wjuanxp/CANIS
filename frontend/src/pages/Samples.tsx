import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Science,
  Edit,
  Delete,
  Refresh,
  Autorenew
} from '@mui/icons-material';

interface Sample {
  id: number;
  project_id: number;
  sample_id: string;
  name: string;
  description?: string;
  sample_type?: string;
  sample_metadata?: Record<string, any>;
  created_at: string;
  spectra_count?: number;
}

interface Project {
  id: number;
  name: string;
  description?: string;
}

interface SampleFormData {
  sample_id: string;
  name: string;
  description: string;
  sample_type: string;
  project_id: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Samples: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<SampleFormData>({
    sample_id: '',
    name: '',
    description: '',
    sample_type: '',
    project_id: 0 // Will be set when projects load
  });

  const sampleTypes = [
    'Solution',
    'Solid',
    'Gas',
    'Powder',
    'Crystal',
    'Liquid',
    'Polymer',
    'Metal',
    'Ceramic',
    'Biological',
    'Other'
  ];

  // Load samples and projects on component mount
  useEffect(() => {
    loadSamples();
    loadProjects();
  }, []);

  const loadSamples = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/samples/');
      if (!response.ok) {
        throw new Error('Failed to load samples');
      }
      const data = await response.json();
      setSamples(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load samples');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/v1/projects/');
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await response.json();
      setProjects(data);
      
      // Set default project if available
      if (data.length > 0 && formData.project_id === 0) {
        setFormData(prev => ({ ...prev, project_id: data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      // Show error but don't prevent the page from working
      setError('Failed to load projects. Please create a project first.');
    }
  };

  const handleCreateSample = async () => {
    try {
      const response = await fetch('/api/v1/samples/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create sample');
      }

      setSuccess('Sample created successfully!');
      setCreateDialogOpen(false);
      resetForm();
      loadSamples();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sample');
    }
  };

  const handleUpdateSample = async () => {
    if (!selectedSample) return;

    try {
      const response = await fetch(`/api/v1/samples/${selectedSample.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sample_id: formData.sample_id,
          name: formData.name,
          description: formData.description,
          sample_type: formData.sample_type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update sample');
      }

      setSuccess('Sample updated successfully!');
      setEditDialogOpen(false);
      resetForm();
      loadSamples();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sample');
    }
  };

  const handleDeleteSample = async (sampleId: number) => {
    if (!window.confirm('Are you sure you want to delete this sample? All associated spectra will also be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/samples/${sampleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sample');
      }

      setSuccess('Sample deleted successfully!');
      loadSamples();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sample');
    }
  };

  const generateSampleId = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
    return `SAMPLE-${dateStr}-${timeStr}-${randomStr}`;
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sample_id: generateSampleId()
    }));
    setCreateDialogOpen(true);
  };

  const openEditDialog = (sample: Sample) => {
    setSelectedSample(sample);
    setFormData({
      sample_id: sample.sample_id,
      name: sample.name,
      description: sample.description || '',
      sample_type: sample.sample_type || '',
      project_id: sample.project_id,
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      sample_id: '',
      name: '',
      description: '',
      sample_type: '',
      project_id: projects.length > 0 ? projects[0].id : 0,
    });
  };

  const handleFormChange = (field: keyof SampleFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Sample Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab 
              label={`Samples (${samples.length})`} 
              icon={<Science />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Sample Library
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={openCreateDialog}
              >
                Create Sample
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={loadSamples}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : projects.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="textSecondary" gutterBottom>
                No projects available. You need to create a project before adding samples.
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.href = '/projects'}
                sx={{ mt: 2 }}
              >
                Go to Projects
              </Button>
            </Box>
          ) : samples.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="textSecondary">
                No samples created yet. Click "Create Sample" to add your first sample.
              </Typography>
            </Box>
          ) : (
            <List>
              {samples.map((sample) => (
                <ListItem 
                  key={sample.id}
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    mb: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItemButton onClick={() => openEditDialog(sample)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {sample.name} ({sample.sample_id})
                          </Typography>
                          {sample.sample_type && (
                            <Chip 
                              label={sample.sample_type} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                          )}
                          <Chip 
                            label={`${sample.spectra_count || 0} spectra`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {sample.description || 'No description'} • 
                            Created: {new Date(sample.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={() => openEditDialog(sample)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteSample(sample.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
      </Paper>

      {/* Create Sample Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Sample</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Project</InputLabel>
                <Select
                  value={formData.project_id}
                  onChange={(e) => handleFormChange('project_id', e.target.value)}
                  label="Project"
                >
                  {projects.length === 0 ? (
                    <MenuItem value={0} disabled>
                      <em>No projects available - Create a project first</em>
                    </MenuItem>
                  ) : (
                    projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sample ID"
                value={formData.sample_id}
                onChange={(e) => handleFormChange('sample_id', e.target.value)}
                fullWidth
                required
                helperText="Auto-generated unique identifier"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => handleFormChange('sample_id', generateSampleId())}
                        edge="end"
                        title="Generate new ID"
                      >
                        <Autorenew />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sample Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Sample Type</InputLabel>
                <Select
                  value={formData.sample_type}
                  onChange={(e) => handleFormChange('sample_type', e.target.value)}
                  label="Sample Type"
                >
                  <MenuItem value="">
                    <em>Select type...</em>
                  </MenuItem>
                  {sampleTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSample}
            variant="contained"
            disabled={!formData.sample_id || !formData.name || !formData.project_id || projects.length === 0}
          >
            Create Sample
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Sample Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Sample</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sample ID"
                value={formData.sample_id}
                onChange={(e) => handleFormChange('sample_id', e.target.value)}
                fullWidth
                required
                helperText="Unique identifier for this sample"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sample Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Sample Type</InputLabel>
                <Select
                  value={formData.sample_type}
                  onChange={(e) => handleFormChange('sample_type', e.target.value)}
                  label="Sample Type"
                >
                  <MenuItem value="">
                    <em>Select type...</em>
                  </MenuItem>
                  {sampleTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateSample}
            variant="contained"
            disabled={!formData.sample_id || !formData.name}
          >
            Update Sample
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Samples;