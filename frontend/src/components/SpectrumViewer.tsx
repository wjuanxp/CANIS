import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import { Spectrum } from '../types';

interface SpectrumViewerProps {
  spectrum: Spectrum;
  width?: string | number;
  height?: string | number;
}

const SpectrumViewer: React.FC<SpectrumViewerProps> = ({ 
  spectrum, 
  width = '100%', 
  height = 600 
}) => {
  const plotData = useMemo(() => {
    if (!spectrum.wavelengths || !spectrum.intensities) {
      return [];
    }

    // Determine axis labels based on technique
    const getAxisLabels = (technique: string) => {
      switch (technique.toLowerCase()) {
        case 'ir':
        case 'infrared':
          return {
            xaxis: 'Wavenumber (cm⁻¹)',
            yaxis: 'Transmittance (%)'
          };
        case 'raman':
          return {
            xaxis: 'Raman Shift (cm⁻¹)',
            yaxis: 'Intensity (counts)'
          };
        case 'uv-vis':
        case 'uv':
        case 'vis':
          return {
            xaxis: 'Wavelength (nm)',
            yaxis: 'Absorbance'
          };
        case 'libs':
          return {
            xaxis: 'Wavelength (nm)',
            yaxis: 'Intensity (counts)'
          };
        case 'x-ray':
        case 'xrf':
          return {
            xaxis: 'Energy (keV)',
            yaxis: 'Intensity (counts)'
          };
        default:
          return {
            xaxis: 'X-axis',
            yaxis: 'Y-axis'
          };
      }
    };

    const labels = getAxisLabels(spectrum.technique);

    return [{
      x: spectrum.wavelengths,
      y: spectrum.intensities,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: spectrum.filename,
      line: {
        color: '#1976d2',
        width: 2
      },
      hovertemplate: `<b>${labels.xaxis}:</b> %{x}<br><b>${labels.yaxis}:</b> %{y}<extra></extra>`
    }];
  }, [spectrum]);

  const plotLayout = useMemo(() => {
    const labels = (() => {
      switch (spectrum.technique.toLowerCase()) {
        case 'ir':
        case 'infrared':
          return {
            xaxis: 'Wavenumber (cm⁻¹)',
            yaxis: 'Transmittance (%)'
          };
        case 'raman':
          return {
            xaxis: 'Raman Shift (cm⁻¹)',
            yaxis: 'Intensity (counts)'
          };
        case 'uv-vis':
        case 'uv':
        case 'vis':
          return {
            xaxis: 'Wavelength (nm)',
            yaxis: 'Absorbance'
          };
        case 'libs':
          return {
            xaxis: 'Wavelength (nm)',
            yaxis: 'Intensity (counts)'
          };
        case 'x-ray':
        case 'xrf':
          return {
            xaxis: 'Energy (keV)',
            yaxis: 'Intensity (counts)'
          };
        default:
          return {
            xaxis: 'X-axis',
            yaxis: 'Y-axis'
          };
      }
    })();

    return {
      title: {
        text: `${spectrum.technique} Spectrum - ${spectrum.filename}`,
        font: { size: 16 }
      },
      xaxis: {
        title: labels.xaxis,
        showgrid: true,
        gridcolor: '#f0f0f0',
        zeroline: false
      },
      yaxis: {
        title: labels.yaxis,
        showgrid: true,
        gridcolor: '#f0f0f0',
        zeroline: false
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      margin: { t: 50, r: 30, b: 50, l: 80 },
      showlegend: false,
      hovermode: 'closest' as const
    };
  }, [spectrum]);

  const plotConfig = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'] as any,
    responsive: true
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata) return [];
    
    const items = [];
    
    if (metadata.data_points) {
      items.push({ label: 'Data Points', value: metadata.data_points.toLocaleString() });
    }
    
    if (metadata.wavelength_range) {
      const [min, max] = metadata.wavelength_range;
      items.push({ 
        label: 'Range', 
        value: `${min.toFixed(1)} - ${max.toFixed(1)}` 
      });
    }
    
    if (metadata.original_format) {
      items.push({ label: 'Format', value: metadata.original_format });
    }
    
    if (metadata.title) {
      items.push({ label: 'Title', value: metadata.title });
    }
    
    if (metadata.origin) {
      items.push({ label: 'Origin', value: metadata.origin });
    }
    
    return items;
  };

  const metadataItems = formatMetadata(spectrum.acquisition_parameters);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with technique and filename */}
      <Box sx={{ mb: 1, flexShrink: 0 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Chip 
            label={spectrum.technique} 
            color="primary" 
            variant="outlined"
            size="small"
          />
          <Typography variant="h6" component="div" noWrap>
            {spectrum.filename}
          </Typography>
        </Stack>
      </Box>

      {/* Metadata - Compact horizontal layout */}
      {metadataItems.length > 0 && (
        <Box sx={{ mb: 1, flexShrink: 0 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            {metadataItems.slice(0, 4).map((item, index) => (
              <Box key={index} sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="textSecondary" component="span">
                  {item.label}: 
                </Typography>
                <Typography variant="body2" component="span" sx={{ ml: 0.5, fontWeight: 500 }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Plot - Takes remaining space */}
      <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
        <Plot
          data={plotData}
          layout={plotLayout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </Box>

      {/* Additional Info - Compact footer */}
      <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" spacing={4} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="textSecondary" component="span">
              Uploaded: 
            </Typography>
            <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
              {new Date(spectrum.created_at).toLocaleDateString()}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="textSecondary" component="span">
              Sample ID: 
            </Typography>
            <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
              {spectrum.sample_id}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default SpectrumViewer;