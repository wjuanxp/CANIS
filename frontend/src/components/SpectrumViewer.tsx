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
import { 
  convertWavelengthUnits,
  getStandardXAxisUnit,
  detectDataMode
} from '../utils/analysisAlgorithms';

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

    // Handle x-axis unit conversion and proper ordering
    let xData = [...spectrum.wavelengths];
    let yData = [...spectrum.intensities];
    let actualXUnit = '';
    
    // Check for XUNITS metadata and convert if needed
    const xunits = spectrum.acquisition_parameters?.XUNITS || 
                   spectrum.acquisition_parameters?.xunits || 
                   spectrum.acquisition_parameters?.xUnits;
    
    if (xunits) {
      const conversionResult = convertWavelengthUnits(xData, xunits, undefined, spectrum.technique);
      
      if (conversionResult.wasConverted) {
        // For all techniques, just convert the data - let Plotly handle ordering with autorange
        xData = conversionResult.convertedX;
        // No manual sorting - we'll use autorange: 'reversed' for IR in the layout
        actualXUnit = conversionResult.actualUnit;
      } else {
        actualXUnit = xunits;
      }
    } else {
      // Use standard unit for technique if no XUNITS specified
      const standardUnit = getStandardXAxisUnit(spectrum.technique);
      actualXUnit = standardUnit.unit;
    }

    // Determine axis labels based on technique and actual units
    const getAxisLabels = (technique: string, xUnit: string) => {
      const techniqueLower = technique.toLowerCase();
      let xaxis = 'X-axis';
      let yaxis = 'Y-axis';
      
      // Set x-axis label based on actual unit
      if (xUnit === 'cm⁻¹') {
        xaxis = techniqueLower.includes('raman') ? 'Raman Shift (cm⁻¹)' : 'Wavenumber (cm⁻¹)';
      } else if (xUnit.toLowerCase().includes('nm') || xUnit.toLowerCase().includes('nanometer')) {
        xaxis = 'Wavelength (nm)';
      } else if (xUnit.toLowerCase().includes('μm') || xUnit.toLowerCase().includes('micrometer')) {
        xaxis = 'Wavelength (μm)';
      } else if (xUnit.toLowerCase().includes('kev')) {
        xaxis = 'Energy (keV)';
      } else {
        // Fallback to technique-based labels
        switch (techniqueLower) {
          case 'ir':
          case 'infrared':
            xaxis = 'Wavenumber (cm⁻¹)';
            break;
          case 'raman':
            xaxis = 'Raman Shift (cm⁻¹)';
            break;
          case 'uv-vis':
          case 'uv':
          case 'vis':
            xaxis = 'Wavelength (nm)';
            break;
          case 'libs':
            xaxis = 'Wavelength (nm)';
            break;
          case 'x-ray':
          case 'xrf':
            xaxis = 'Energy (keV)';
            break;
          default:
            xaxis = 'X-axis';
        }
      }
      
      // Set y-axis label based on technique and data mode
      if (['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(techniqueLower)) {
        const dataMode = detectDataMode(yData, technique, spectrum.acquisition_parameters);
        yaxis = dataMode === 'absorbance' ? 'Absorbance' : 'Transmittance (%)';
      } else {
        switch (techniqueLower) {
          case 'raman':
            yaxis = 'Intensity (counts)';
            break;
          case 'libs':
          case 'x-ray':
          case 'xrf':
            yaxis = 'Intensity (counts)';
            break;
          default:
            yaxis = 'Y-axis';
        }
      }
      
      return { xaxis, yaxis };
    };

    const labels = getAxisLabels(spectrum.technique, actualXUnit);

    return [{
      x: xData,
      y: yData,
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

  // Determine actual X-axis unit for both plotData and plotLayout
  const actualXUnit = useMemo(() => {
    const xunits = spectrum.acquisition_parameters?.XUNITS || 
                   spectrum.acquisition_parameters?.xunits || 
                   spectrum.acquisition_parameters?.xUnits;
    
    if (xunits) {
      const conversionResult = convertWavelengthUnits(spectrum.wavelengths, xunits, undefined, spectrum.technique);
      return conversionResult.wasConverted ? conversionResult.actualUnit : xunits;
    } else {
      const standardUnit = getStandardXAxisUnit(spectrum.technique);
      return standardUnit.unit;
    }
  }, [spectrum]);

  const plotLayout = useMemo(() => {

    const getAxisLabels = (technique: string, xUnit: string) => {
      const techniqueLower = technique.toLowerCase();
      let xaxis = 'X-axis';
      let yaxis = 'Y-axis';
      
      // Set x-axis label based on actual unit
      if (xUnit === 'cm⁻¹') {
        xaxis = techniqueLower.includes('raman') ? 'Raman Shift (cm⁻¹)' : 'Wavenumber (cm⁻¹)';
      } else if (xUnit.toLowerCase().includes('nm') || xUnit.toLowerCase().includes('nanometer')) {
        xaxis = 'Wavelength (nm)';
      } else if (xUnit.toLowerCase().includes('μm') || xUnit.toLowerCase().includes('micrometer')) {
        xaxis = 'Wavelength (μm)';
      } else if (xUnit.toLowerCase().includes('kev')) {
        xaxis = 'Energy (keV)';
      } else {
        // Fallback to technique-based labels
        switch (techniqueLower) {
          case 'ir':
          case 'infrared':
            xaxis = 'Wavenumber (cm⁻¹)';
            break;
          case 'raman':
            xaxis = 'Raman Shift (cm⁻¹)';
            break;
          case 'uv-vis':
          case 'uv':
          case 'vis':
            xaxis = 'Wavelength (nm)';
            break;
          case 'libs':
            xaxis = 'Wavelength (nm)';
            break;
          case 'x-ray':
          case 'xrf':
            xaxis = 'Energy (keV)';
            break;
          default:
            xaxis = 'X-axis';
        }
      }
      
      // Set y-axis label based on technique and data mode
      if (['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(techniqueLower)) {
        const dataMode = detectDataMode(spectrum.intensities, technique, spectrum.acquisition_parameters);
        yaxis = dataMode === 'absorbance' ? 'Absorbance' : 'Transmittance (%)';
      } else {
        switch (techniqueLower) {
          case 'raman':
            yaxis = 'Intensity (counts)';
            break;
          case 'libs':
          case 'x-ray':
          case 'xrf':
            yaxis = 'Intensity (counts)';
            break;
          default:
            yaxis = 'Y-axis';
        }
      }
      
      return { xaxis, yaxis };
    };

    const labels = getAxisLabels(spectrum.technique, actualXUnit);

    return {
      title: {
        text: `${spectrum.technique} Spectrum - ${spectrum.filename}`,
        font: { size: 16 }
      },
      xaxis: {
        title: labels.xaxis,
        showgrid: true,
        gridcolor: '#f0f0f0',
        zeroline: false,
        // For IR spectra, reverse the axis so high wavenumbers are on the left
        autorange: spectrum.technique.toLowerCase().includes('ir') ? 'reversed' : true
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
  }, [spectrum, actualXUnit]);

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