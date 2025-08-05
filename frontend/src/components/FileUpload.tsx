import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  LinearProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  useTheme
} from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const UploadArea = styled(Paper)(({ theme, isDragActive }: { theme: any; isDragActive: boolean }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.3s ease',
  backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const HiddenInput = styled('input')({
  display: 'none',
});

interface FileUploadProps {
  onUploadSuccess: (response: any) => void;
  sampleId?: number;
  samples?: Array<{ id: number; name: string }>;
}

interface UploadState {
  isDragActive: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  success: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, sampleId, samples = [] }) => {
  const theme = useTheme();
  const [selectedSampleId, setSelectedSampleId] = useState<number>(sampleId || 0);
  const [selectedTechnique, setSelectedTechnique] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragActive: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    success: null,
  });

  const allowedFormats = ['.csv', '.dx', '.jdx', '.jcamp', '.txt'];
  const availableTechniques = [
    { value: '', label: 'Auto-detect (default)' },
    { value: 'IR', label: 'Infrared (IR)' },
    { value: 'Raman', label: 'Raman' },
    { value: 'UV-Vis', label: 'UV-Visible' },
    { value: 'LIBS', label: 'LIBS' },
    { value: 'XRF', label: 'X-ray Fluorescence (XRF)' },
    { value: 'NMR', label: 'NMR' },
    { value: 'MS', label: 'Mass Spectrometry (MS)' },
  ];

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFormats.includes(extension)) {
      return `Unsupported file format. Allowed formats: ${allowedFormats.join(', ')}`;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedSampleId || selectedSampleId === 0) {
      setUploadState(prev => ({ 
        ...prev, 
        error: 'Please select a sample before uploading. The spectrum needs to be linked to a sample.' 
      }));
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      error: null,
      success: null,
      uploadProgress: 0,
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sample_id', selectedSampleId.toString());
      
      // Add manual technique if selected
      if (selectedTechnique) {
        formData.append('manual_technique', selectedTechnique);
      }

      const response = await fetch('/api/v1/spectra/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      
      const techniqueMessage = selectedTechnique 
        ? ` (Technique: ${selectedTechnique})` 
        : ` (Technique: ${result.technique})`;
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        success: `File uploaded successfully! Spectrum ID: ${result.spectrum_id}${techniqueMessage}`,
        uploadProgress: 100,
      }));

      onUploadSuccess(result);

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        uploadProgress: 0,
      }));
    }
  }, [selectedSampleId, onUploadSuccess, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragActive: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragActive: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragActive: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  return (
    <Box>
      {/* Sample Selection */}
      {/* Debug: Always show sample selection when samples exist */}
      {samples.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Sample *</InputLabel>
          <Select
            value={selectedSampleId}
            onChange={(e) => setSelectedSampleId(Number(e.target.value))}
            label="Select Sample *"
            required
          >
            <MenuItem value={0}>
              <em>Choose a sample...</em>
            </MenuItem>
            {samples.map((sample) => (
              <MenuItem key={sample.id} value={sample.id}>
                {sample.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Technique Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Technique</InputLabel>
        <Select
          value={selectedTechnique}
          onChange={(e) => setSelectedTechnique(e.target.value)}
          label="Technique"
        >
          {availableTechniques.map((technique) => (
            <MenuItem key={technique.value} value={technique.value}>
              {technique.label}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, ml: 1 }}>
          {selectedTechnique 
            ? `Manual selection: ${availableTechniques.find(t => t.value === selectedTechnique)?.label}` 
            : 'System will try to auto-detect technique from file metadata. Select manually if auto-detection fails.'
          }
        </Typography>
      </FormControl>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.100', fontSize: '0.8rem' }}>
          Debug: Samples count: {samples.length}, sampleId prop: {sampleId}, selectedSampleId: {selectedSampleId}
        </Box>
      )}

      {/* Upload Area */}
      <UploadArea
        theme={theme}
        isDragActive={uploadState.isDragActive}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!selectedSampleId || selectedSampleId === 0) {
            setUploadState(prev => ({ 
              ...prev, 
              error: 'Please select a sample before uploading files.' 
            }));
            return;
          }
          document.getElementById('file-input')?.click();
        }}
        sx={{
          opacity: (!selectedSampleId || selectedSampleId === 0) ? 0.6 : 1,
          pointerEvents: (!selectedSampleId || selectedSampleId === 0) ? 'auto' : 'auto'
        }}
      >
        <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {uploadState.isDragActive 
            ? 'Drop file here' 
            : (!selectedSampleId || selectedSampleId === 0)
              ? 'Select a sample first, then upload files'
              : 'Drag & drop spectral file or click to browse'
          }
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Supported formats: {allowedFormats.join(', ')}
        </Typography>
        {(!selectedSampleId || selectedSampleId === 0) && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
            ⚠️ Sample selection is required
          </Typography>
        )}
        <Typography variant="caption" color="textSecondary">
          Maximum file size: 10MB
        </Typography>

        <HiddenInput
          id="file-input"
          type="file"
          accept={allowedFormats.join(',')}
          onChange={handleFileSelect}
        />
      </UploadArea>

      {/* Supported Formats */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Supported formats:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="CSV" size="small" variant="outlined" />
          <Chip label="JCAMP-DX" size="small" variant="outlined" />
          <Chip label="JDX" size="small" variant="outlined" />
          <Chip label="DX" size="small" variant="outlined" />
        </Stack>
      </Box>

      {/* Progress Bar */}
      {uploadState.isUploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Processing file...
          </Typography>
        </Box>
      )}

      {/* Success Message */}
      {uploadState.success && (
        <Alert 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ mt: 2 }}
          onClose={() => setUploadState(prev => ({ ...prev, success: null }))}
        >
          {uploadState.success}
        </Alert>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <Alert 
          severity="error" 
          icon={<ErrorIcon />}
          sx={{ mt: 2 }}
          onClose={() => setUploadState(prev => ({ ...prev, error: null }))}
        >
          {uploadState.error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;