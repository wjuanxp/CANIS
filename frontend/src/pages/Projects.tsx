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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Add,
  FolderOpen,
  Edit,
  Delete,
  Refresh,
  Science,
  Assessment
} from '@mui/icons-material';

interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  settings?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  samples_count?: number;
  spectra_count?: number;
}

interface ProjectFormData {
  name: string;
  description: string;
  owner_id: number;
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

const Projects: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    owner_id: 1 // Default owner ID
  });

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/projects/');
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/v1/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create project');
      }

      setSuccess('Project created successfully!');
      setTimeout(() => setSuccess(null), 5000);
      setCreateDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`/api/v1/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update project');
      }

      setSuccess('Project updated successfully!');
      setTimeout(() => setSuccess(null), 5000);
      setEditDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Are you sure you want to delete this project? All associated samples and spectra will also be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setSuccess('Project deleted successfully!');
      setTimeout(() => setSuccess(null), 5000);
      loadProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      owner_id: project.owner_id,
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      owner_id: 1,
    });
  };

  const handleFormChange = (field: keyof ProjectFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Project Management
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
              label={`Projects (${projects.length})`} 
              icon={<FolderOpen />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Project Library
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={openCreateDialog}
              >
                Create Project
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={loadProjects}
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
                No projects created yet. Projects organize your samples and spectral data.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreateDialog}
                sx={{ mt: 2 }}
              >
                Create Your First Project
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {projects.map((project) => (
                <Grid item xs={12} sm={6} md={4} key={project.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {project.description || 'No description'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip 
                          icon={<Science />}
                          label={`${project.samples_count || 0} samples`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={<Assessment />}
                          label={`${project.spectra_count || 0} spectra`} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="caption" color="textSecondary">
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => openEditDialog(project)}
                      >
                        Edit
                      </Button>
                      <IconButton
                        onClick={() => handleDeleteProject(project.id)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Create Project Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Project Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                fullWidth
                required
                helperText="Choose a descriptive name for your project"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                fullWidth
                multiline
                rows={3}
                helperText="Describe the purpose or scope of this project"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject}
            variant="contained"
            disabled={!formData.name}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Project Name"
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
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateProject}
            variant="contained"
            disabled={!formData.name}
          >
            Update Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;