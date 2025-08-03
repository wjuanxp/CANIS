import React, { useState, useEffect, useMemo } from 'react';
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
  InputAdornment
} from '@mui/material';
import {
  Upload,
  Visibility,
  Delete,
  Refresh,
  Search,
  Clear
} from '@mui/icons-material';
import FileUpload from '../components/FileUpload';
import SpectrumViewer from '../components/SpectrumViewer';
import { Spectrum, Sample, FileUploadResponse } from '../types';

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

const Spectra: React.FC = () => {
  const [tabValue, setTabValue] = useState(1);
  const [spectra, setSpectra] = useState<Spectrum[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSpectrum, setSelectedSpectrum] = useState<Spectrum | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load spectra and samples on component mount
  useEffect(() => {
    loadSpectra();
    loadSamples();
  }, []);

  const loadSpectra = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/spectra/');
      if (!response.ok) {
        throw new Error('Failed to load spectra');
      }
      const data = await response.json();
      setSpectra(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spectra');
    } finally {
      setLoading(false);
    }
  };

  const loadSamples = async () => {
    try {
      const response = await fetch('/api/v1/samples/');
      if (!response.ok) {
        throw new Error('Failed to load samples');
      }
      const data = await response.json();
      setSamples(data);
    } catch (err) {
      console.error('Failed to load samples:', err);
    }
  };

  const handleUploadSuccess = (response: FileUploadResponse) => {
    // Reload spectra list
    loadSpectra();
    
    // Switch to browse tab
    setTabValue(1);
    
    // Show success message
    setError(null);
  };

  const handleViewSpectrum = (spectrum: Spectrum) => {
    setSelectedSpectrum(spectrum);
    setViewerOpen(true);
  };

  const handleDeleteSpectrum = async (spectrumId: number) => {
    if (!window.confirm('Are you sure you want to delete this spectrum?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/spectra/${spectrumId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete spectrum');
      }

      // Reload spectra list
      loadSpectra();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete spectrum');
    }
  };

  const getSampleName = (sampleId: number) => {
    const sample = samples.find(s => Number(s.id) === sampleId);
    return sample ? sample.name : `Sample ${sampleId}`;
  };

  // Search functionality - filter spectra based on all searchable fields
  const filteredSpectra = useMemo(() => {
    if (!searchQuery.trim()) {
      return spectra;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return spectra.filter(spectrum => {
      // Search in filename
      if (spectrum.filename?.toLowerCase().includes(query)) return true;
      
      // Search in technique
      if (spectrum.technique?.toLowerCase().includes(query)) return true;
      
      // Search in sample name
      const sampleName = getSampleName(spectrum.sample_id);
      if (sampleName.toLowerCase().includes(query)) return true;
      
      // Search in acquisition parameters (metadata)
      if (spectrum.acquisition_parameters) {
        const metadata = spectrum.acquisition_parameters;
        
        // Search in metadata values (convert to string and search)
        const searchInMetadata = (obj: any): boolean => {
          if (!obj) return false;
          
          if (typeof obj === 'string') {
            return obj.toLowerCase().includes(query);
          }
          
          if (typeof obj === 'number') {
            return obj.toString().includes(query);
          }
          
          if (Array.isArray(obj)) {
            return obj.some(item => searchInMetadata(item));
          }
          
          if (typeof obj === 'object') {
            return Object.values(obj).some(value => searchInMetadata(value));
          }
          
          return false;
        };
        
        if (searchInMetadata(metadata)) return true;
      }
      
      // Search in spectrum ID
      if (spectrum.id.toString().includes(query)) return true;
      
      // Search in sample ID
      if (spectrum.sample_id.toString().includes(query)) return true;
      
      // Search in creation date
      if (new Date(spectrum.created_at).toLocaleDateString().toLowerCase().includes(query)) return true;
      if (new Date(spectrum.created_at).toLocaleString().toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [spectra, searchQuery, samples]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Spectral Data Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab 
              label="Upload Files" 
              icon={<Upload />} 
              iconPosition="start"
            />
            <Tab 
              label={`Browse Spectra (${spectra.length})`} 
              icon={<Visibility />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ maxWidth: 800 }}>
            <Typography variant="h6" gutterBottom>
              Upload Spectral Data Files
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Upload CSV, JCAMP-DX, or other supported spectral data files. 
              Files will be automatically parsed and the spectroscopic technique will be detected.
            </Typography>
            
            <FileUpload 
              onUploadSuccess={handleUploadSuccess}
              samples={samples.map(s => ({ id: Number(s.id), name: s.name }))}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Spectral Data Library
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={loadSpectra}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {/* Search Bar */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search spectra by filename, technique, sample, metadata, date, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={clearSearch}
                      edge="end"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
            />
            {searchQuery && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {filteredSpectra.length} of {spectra.length} spectra match your search
              </Typography>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : spectra.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="textSecondary">
                No spectra uploaded yet. Use the "Upload Files" tab to add spectral data.
              </Typography>
            </Box>
          ) : filteredSpectra.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="textSecondary">
                No spectra match your search criteria. Try adjusting your search terms.
              </Typography>
              <Button onClick={clearSearch} sx={{ mt: 2 }}>
                Clear Search
              </Button>
            </Box>
          ) : (
            <List>
              {filteredSpectra.map((spectrum) => (
                <ListItem 
                  key={spectrum.id}
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
                  <ListItemButton onClick={() => handleViewSpectrum(spectrum)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {spectrum.filename}
                          </Typography>
                          <Chip 
                            label={spectrum.technique} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Sample: {getSampleName(spectrum.sample_id)} • 
                            Data Points: {spectrum.wavelengths?.length || 0} • 
                            Uploaded: {new Date(spectrum.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                  <IconButton
                    onClick={() => handleDeleteSpectrum(spectrum.id)}
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <Delete />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
      </Paper>

      {/* Spectrum Viewer Dialog */}
      <Dialog 
        open={viewerOpen} 
        onClose={() => setViewerOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '95vh', maxHeight: 'none' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Spectrum Viewer
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflow: 'hidden' }}>
          {selectedSpectrum && (
            <SpectrumViewer 
              spectrum={selectedSpectrum}
              height="calc(95vh - 120px)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewerOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Spectra;