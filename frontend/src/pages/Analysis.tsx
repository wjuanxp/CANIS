import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Timeline as BaselineIcon,
  ShowChart as PeakIcon,
  Functions as IntegrationIcon,
  Settings as SettingsIcon,
  PlayArrow as AutoIcon,
  PanTool as ManualIcon,
  Delete as DeleteIcon,
  Download as ExportIcon,
  ArrowBack as BackIcon,
  Home as HomeIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  Save
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import { Spectrum, Analysis as AnalysisType, AnalysisCreate } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { 
  alsBaselineCorrection, 
  alsBaselineCorrectionSimplified,
  polynomialBaselineCorrection, 
  linearBaselineCorrection,
  getRecommendedLambda,
  detectPeaks,
  detectPeaksSimplified,
  DetectedPeak,
  convertAbsorbanceTransmittance,
  detectDataMode,
  convertWavelengthUnits,
  getStandardXAxisUnit
} from '../utils/analysisAlgorithms';

interface Peak {
  id: string;
  x: number;
  y: number;
  area?: number;
  width?: number;
  prominence?: number;
  integrationArea?: number;
  integrationStart?: number;
  integrationEnd?: number;
  manuallyAdjusted?: boolean;
}

interface BaselinePoint {
  x: number;
  y: number;
}


const Analysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const spectrum = location.state?.spectrum as Spectrum;
  
  // State management
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<'baseline' | 'peak' | 'integration' | null>(null);
  const [toolModes, setToolModes] = useState<{
    baseline: 'auto' | 'manual';
    peak: 'auto' | 'manual';
    integration: 'auto' | 'manual';
  }>({
    baseline: 'auto',
    peak: 'auto', 
    integration: 'auto'
  });
  const [processedData, setProcessedData] = useState<{x: number[], y: number[]}>({x: [], y: []});
  const [originalData, setOriginalData] = useState<{x: number[], y: number[]}>({x: [], y: []});
  const [baselinePoints, setBaselinePoints] = useState<BaselinePoint[]>([]);
  const [detectedPeaks, setDetectedPeaks] = useState<Peak[]>([]);
  const [selectedPeakForBoundaries, setSelectedPeakForBoundaries] = useState<string | null>(null);
  const [boundaryAdjustmentStep, setBoundaryAdjustmentStep] = useState<'start' | 'end' | null>(null);
  const [integrationMessage, setIntegrationMessage] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Auto-adjust sidebar width based on content needs
    // Base width + extra space for additional columns (Integration, Actions)
    const baseWidth = 320;
    const extraColumnsWidth = 140; // Additional space for Integration and Actions columns
    return baseWidth + extraColumnsWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [dataMode, setDataMode] = useState<'absorbance' | 'transmittance'>('absorbance');
  const [originalDataMode, setOriginalDataMode] = useState<'absorbance' | 'transmittance'>('absorbance');
  const [xAxisUnit, setXAxisUnit] = useState<string>('');
  const [unitConversionInfo, setUnitConversionInfo] = useState<string>('');
  
  // Analysis tracking state
  const [savedAnalyses, setSavedAnalyses] = useState<{
    baselineCorrection?: AnalysisType;
    peakDetection?: AnalysisType;
    peakIntegration?: AnalysisType;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveNotification, setSaveNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  
  // Analysis parameters - initialize with technique-specific defaults
  const [baselineParams, setBaselineParams] = useState(() => {
    const technique = spectrum?.technique || 'default';
    const lambdaRec = getRecommendedLambda(technique);
    return {
      method: 'als', // Asymmetric Least Squares
      lambda: lambdaRec.default,
      p: 0.01,
      iterations: 10,
      useSimplified: false // Option to use simplified ALS for performance
    };
  });
  
  const [peakParams, setPeakParams] = useState({
    prominence: 0.05, // 5% of intensity range
    width: 2, // Minimum peak width in data points
    distance: 5, // Minimum distance between peaks (data points)
    threshold: 0.01 // 1% absolute threshold
  });

  // Load saved analysis results when spectrum opens
  const loadSavedAnalysisResults = useCallback(async () => {
    if (!spectrum?.id) return;

    try {
      console.log(`Loading saved analysis results for spectrum ${spectrum.id}`);
      const analyses = await apiService.getLatestAnalysesForSpectrum(spectrum.id.toString());
      
      const loadedAnalyses: any = {};
      
      for (const analysis of analyses) {
        loadedAnalyses[analysis.method_name] = analysis;
        
        // Apply saved results to UI state
        switch (analysis.method_name) {
          case 'baseline_correction':
            if (analysis.results.applied && analysis.results.corrected_intensities) {
              setProcessedData(prev => ({
                ...prev,
                y: analysis.results.corrected_intensities
              }));
              
              if (analysis.results.baseline) {
                setBaselinePoints(analysis.results.baseline.map((val: number, i: number) => ({
                  x: originalData.x[i],
                  y: val
                })));
              }
              
              setBaselineParams(analysis.parameters);
              console.log('Baseline correction restored from saved analysis');
            }
            break;
            
          case 'peak_detection':
            if (analysis.results.peaks) {
              const restoredPeaks: Peak[] = analysis.results.peaks.map((peak: any) => ({
                id: peak.id,
                x: peak.position,
                y: peak.intensity,
                width: peak.width,
                prominence: peak.prominence
              }));
              setDetectedPeaks(restoredPeaks);
              setPeakParams(analysis.parameters);
              console.log(`Peak detection restored: ${restoredPeaks.length} peaks`);
            }
            break;
            
          case 'peak_integration':
            if (analysis.results.integrated_peaks) {
              setDetectedPeaks(prev => prev.map(peak => {
                const savedPeak = analysis.results.integrated_peaks.find((sp: any) => sp.id === peak.id);
                if (savedPeak) {
                  return {
                    ...peak,
                    integrationArea: savedPeak.integration_area,
                    integrationStart: savedPeak.integration_start,
                    integrationEnd: savedPeak.integration_end,
                    manuallyAdjusted: savedPeak.manually_adjusted
                  };
                }
                return peak;
              }));
              console.log(`Integration results restored for ${analysis.results.integrated_peaks.length} peaks`);
            }
            break;
        }
      }
      
      setSavedAnalyses(loadedAnalyses);
      setHasUnsavedChanges(false);
      console.log('Saved analysis results loaded successfully');
    } catch (error) {
      console.error('Failed to load saved analysis results:', error);
    }
  }, [spectrum?.id, originalData.x]);

  // Show save notification
  const showSaveNotification = useCallback((message: string, type: 'success' | 'error') => {
    setSaveNotification({ show: true, message, type });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setSaveNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // Initialize data when spectrum changes
  useEffect(() => {
    if (spectrum?.wavelengths && spectrum?.intensities) {
      let xData = [...spectrum.wavelengths];
      let yData = [...spectrum.intensities];
      let currentXUnit = '';
      let conversionInfo = '';
      
      // Handle x-axis unit conversion
      const xunits = spectrum.acquisition_parameters?.XUNITS || 
                     spectrum.acquisition_parameters?.xunits || 
                     spectrum.acquisition_parameters?.xUnits;
      
      if (xunits) {
        console.log('Original XUNITS:', xunits);
        const conversionResult = convertWavelengthUnits(xData, xunits, undefined, spectrum.technique);
        
        if (conversionResult.wasConverted) {
          // For all techniques, just convert the data - let Plotly handle ordering with autorange
          xData = conversionResult.convertedX;
          // No manual sorting - we'll use autorange: 'reversed' for IR in the layout
          currentXUnit = conversionResult.actualUnit;
          conversionInfo = conversionResult.conversionInfo || '';
          
          console.log('Unit conversion applied:', conversionInfo);
          console.log('New x-axis unit:', currentXUnit);
        } else {
          currentXUnit = xunits;
        }
      } else {
        // Use standard unit for technique if no XUNITS specified
        const standardUnit = getStandardXAxisUnit(spectrum.technique);
        currentXUnit = standardUnit.label;
        console.log('No XUNITS found, using standard unit:', currentXUnit);
      }
      
      const data = { x: xData, y: yData };
      setOriginalData(data);
      setProcessedData(data);
      setXAxisUnit(currentXUnit);
      setUnitConversionInfo(conversionInfo);
      
      // Auto-detect data mode for UV-Vis and IR spectra
      if (['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(spectrum.technique.toLowerCase())) {
        const detectedMode = detectDataMode(
          spectrum.intensities, 
          spectrum.technique, 
          spectrum.acquisition_parameters
        );
        
        // Debug logging to verify YUNITS detection
        console.log('Data mode detection for:', spectrum.filename);
        console.log('Technique:', spectrum.technique);
        console.log('Acquisition parameters:', spectrum.acquisition_parameters);
        console.log('Detected mode:', detectedMode);
        
        setDataMode(detectedMode);
        setOriginalDataMode(detectedMode);
      }
    }
  }, [spectrum]);

  // Load saved analysis results when spectrum changes
  useEffect(() => {
    if (spectrum?.id && originalData.x.length > 0) {
      // Add a small delay to ensure original data is fully loaded
      const timer = setTimeout(() => {
        loadSavedAnalysisResults();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [spectrum?.id, originalData.x.length, loadSavedAnalysisResults]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to go back to spectra page
      if (event.key === 'Escape') {
        navigate('/spectra');
      }
      // Ctrl/Cmd + H to go to home/dashboard
      if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        navigate('/');
      }
      // Ctrl/Cmd + B to toggle tools panel
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setToolsDrawerOpen(prev => !prev);
      }
      // F1 or ? to show help
      if (event.key === 'F1' || (event.shiftKey && event.key === '?')) {
        event.preventDefault();
        setHelpDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Get spectrum-specific tools based on technique
  const getAvailableTools = useCallback((technique: string) => {
    const commonTools = [
      { id: 'baseline', name: 'Baseline Correction', icon: BaselineIcon },
      { id: 'peak', name: 'Peak Detection', icon: PeakIcon },
      { id: 'integration', name: 'Integration', icon: IntegrationIcon }
    ];

    const techniqueSpecific: any = {
      'ir': [
        { id: 'ftir-corrections', name: 'FTIR Corrections' },
        { id: 'functional-groups', name: 'Functional Group ID' }
      ],
      'raman': [
        { id: 'cosmic-ray', name: 'Cosmic Ray Removal' },
        { id: 'spike-removal', name: 'Spike Removal' }
      ],
      'uv-vis': [
        { id: 'beer-lambert', name: 'Beer-Lambert Analysis' },
        { id: 'kinetics', name: 'Kinetic Analysis' }
      ],
      'libs': [
        { id: 'element-id', name: 'Element Identification' },
        { id: 'quantitative', name: 'Quantitative Analysis' }
      ]
    };

    return {
      common: commonTools,
      specific: techniqueSpecific[technique.toLowerCase()] || []
    };
  }, []);

  const availableTools = useMemo(() => {
    if (!spectrum) return { common: [], specific: [] };
    return getAvailableTools(spectrum.technique);
  }, [spectrum, getAvailableTools]);

  // Handle data mode switching (absorbance/transmittance)
  const handleDataModeChange = useCallback((newMode: 'absorbance' | 'transmittance') => {
    if (newMode === dataMode) return;
    
    // Convert processed data
    const convertedProcessedY = convertAbsorbanceTransmittance(processedData.y, dataMode, newMode);
    setProcessedData(prev => ({ ...prev, y: convertedProcessedY }));
    
    // Convert original data
    const convertedOriginalY = convertAbsorbanceTransmittance(originalData.y, dataMode, newMode);
    setOriginalData(prev => ({ ...prev, y: convertedOriginalY }));
    
    // Convert baseline points if they exist
    if (baselinePoints.length > 0) {
      const convertedBaseline = baselinePoints.map(point => ({
        ...point,
        y: convertAbsorbanceTransmittance([point.y], dataMode, newMode)[0]
      }));
      setBaselinePoints(convertedBaseline);
    }
    
    // Convert detected peaks
    if (detectedPeaks.length > 0) {
      const convertedPeaks = detectedPeaks.map(peak => ({
        ...peak,
        y: convertAbsorbanceTransmittance([peak.y], dataMode, newMode)[0]
      }));
      setDetectedPeaks(convertedPeaks);
    }
    
    setDataMode(newMode);
  }, [dataMode, processedData, originalData, baselinePoints, detectedPeaks]);

  // Helper function to set mode for specific tool
  const setToolMode = useCallback((tool: 'baseline' | 'peak' | 'integration', mode: 'auto' | 'manual') => {
    setToolModes(prev => ({
      ...prev,
      [tool]: mode
    }));
  }, []);

  // Save analysis results to database
  const saveAnalysisToDatabase = useCallback(async (
    methodName: string,
    parameters: any,
    results: any,
    updateExisting?: boolean
  ) => {
    if (!spectrum?.id) {
      console.error('No spectrum ID available for saving analysis');
      return null;
    }

    try {
      setIsSaving(true);
      
      const analysisData: AnalysisCreate = {
        spectrum_id: spectrum.id,
        method_name: methodName,
        parameters,
        results
      };

      let savedAnalysis: AnalysisType;

      // Check if we should update existing analysis or create new one
      const existingAnalysis = savedAnalyses[methodName as keyof typeof savedAnalyses];
      
      if (updateExisting && existingAnalysis) {
        // Update existing analysis
        savedAnalysis = await apiService.updateAnalysis(existingAnalysis.id.toString(), {
          parameters,
          results
        });
        console.log(`Updated existing ${methodName} analysis with ID: ${savedAnalysis.id}`);
      } else {
        // Create new analysis
        savedAnalysis = await apiService.createAnalysis(analysisData);
        console.log(`Saved new ${methodName} analysis with ID: ${savedAnalysis.id}`);
      }

      // Update local state to track saved analyses
      setSavedAnalyses(prev => ({
        ...prev,
        [methodName]: savedAnalysis
      }));

      return savedAnalysis;
    } catch (error) {
      console.error(`Failed to save ${methodName} analysis:`, error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      
      // Log the data that was being sent
      console.error('Analysis data that failed to save:', {
        spectrum_id: spectrum.id,
        method_name: methodName,
        parameters,
        results
      });
      
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [spectrum?.id, savedAnalyses]);

  // Baseline correction algorithms
  const performBaselineCorrection = useCallback(async (method: string, params: any) => {
    setIsProcessing(true);
    try {
      const { x, y } = processedData;
      let result: { corrected: number[], baseline: number[] };
      
      switch (method) {
        case 'als':
          // Use simplified ALS for performance if dataset is large or if explicitly requested
          if (params.useSimplified || y.length > 2000) {
            result = alsBaselineCorrectionSimplified(y, params.lambda, params.p, params.iterations);
          } else {
            result = alsBaselineCorrection(y, params.lambda, params.p, params.iterations);
          }
          break;
        case 'polynomial':
          result = polynomialBaselineCorrection(x, y, params.degree || 3);
          break;
        case 'linear':
          result = linearBaselineCorrection(x, y);
          break;
        default:
          // Default to simplified ALS
          result = alsBaselineCorrectionSimplified(y, params.lambda, params.p, params.iterations);
      }
      
      // Update processed data with corrected spectrum
      setProcessedData(prev => ({ ...prev, y: result.corrected }));
      
      // Update baseline points for visualization
      setBaselinePoints(result.baseline.map((val, i) => ({ x: x[i], y: val })));
      
      console.log(`Baseline correction (${method}) completed successfully`);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Baseline correction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [processedData]);

  // Peak detection algorithms
  const performPeakDetection = useCallback(async (params: any) => {
    setIsProcessing(true);
    try {
      const { y, x } = processedData;
      const { prominence, width, distance, threshold } = params;
      
      // Use the new peak detection algorithm
      const detectedPeaks = detectPeaks(x, y, {
        prominence: prominence,
        distance: distance,
        width: width,
        threshold: threshold,
        relativeThreshold: 0.01, // 1% of max intensity
        technique: spectrum?.technique || '',
        dataMode: dataMode
      });
      
      // Convert DetectedPeak[] to Peak[] format
      const peaks: Peak[] = detectedPeaks.map(peak => ({
        id: peak.id,
        x: peak.x,
        y: peak.y,
        prominence: peak.prominence,
        width: peak.width
      }));
      
      setDetectedPeaks(peaks);
      console.log(`Peak detection completed: found ${peaks.length} peaks`);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Peak detection failed:', error);
      // Fallback to simplified algorithm
      try {
        const { y, x } = processedData;
        const { prominence, distance } = params;
        
        const detectedPeaks = detectPeaksSimplified(x, y, {
          prominence: prominence,
          distance: distance,
          windowSize: Math.max(3, Math.floor(x.length / 100)),
          technique: spectrum?.technique || '',
          dataMode: dataMode
        });
        
        const peaks: Peak[] = detectedPeaks.map(peak => ({
          id: peak.id,
          x: peak.x,
          y: peak.y,
          prominence: peak.prominence
        }));
        
        setDetectedPeaks(peaks);
        console.log(`Peak detection (simplified) completed: found ${peaks.length} peaks`);
        setHasUnsavedChanges(true);
      } catch (fallbackError) {
        console.error('Both peak detection algorithms failed:', fallbackError);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [processedData, dataMode, spectrum]);

  // Integration calculation with improved peak boundary detection
  const calculatePeakArea = useCallback((peak: Peak, customWidth?: number, returnWithBoundaries?: boolean) => {
    const { x, y } = processedData;
    
    if (x.length === 0 || y.length === 0) {
      return returnWithBoundaries ? { area: 0, startX: 0, endX: 0 } : 0;
    }
    
    let startIndex, endIndex;
    
    // Use manual boundaries if they exist, otherwise calculate automatically
    if (peak.integrationStart !== undefined && peak.integrationEnd !== undefined) {
      console.log(`Calculating area with manual boundaries: ${peak.integrationStart} to ${peak.integrationEnd}`);
      
      // Find the closest data points to the manual boundaries
      startIndex = 0;
      endIndex = x.length - 1;
      
      // Find start index
      for (let i = 0; i < x.length; i++) {
        if (x[i] >= peak.integrationStart) {
          startIndex = i;
          break;
        }
      }
      
      // Find end index
      for (let i = x.length - 1; i >= 0; i--) {
        if (x[i] <= peak.integrationEnd) {
          endIndex = i;
          break;
        }
      }
      
      // Ensure valid range
      if (startIndex >= endIndex) {
        if (startIndex > 0) startIndex = startIndex - 1;
        if (endIndex < x.length - 1) endIndex = endIndex + 1;
      }
      
      console.log(`Using indices: ${startIndex} to ${endIndex} (x: ${x[startIndex]} to ${x[endIndex]})`);
    } else {
      // Use automatic boundary detection
      const peakIndex = x.findIndex(xVal => Math.abs(xVal - peak.x) < 0.01);
      if (peakIndex === -1) return returnWithBoundaries ? { area: 0, startX: 0, endX: 0 } : 0;
      
      // Use peak width if available, otherwise use custom width or default
      let integrationWidth = customWidth || 10;
      if (peak.width && peak.width > 0) {
        // Use the detected peak width as a basis for integration
        integrationWidth = Math.max(Math.round(peak.width * 2), 5); // Double the peak width, minimum 5 points
      }
      
      startIndex = Math.max(0, peakIndex - integrationWidth);
      endIndex = Math.min(x.length - 1, peakIndex + integrationWidth);
    }
    
    // Ensure we have a valid range
    if (startIndex >= endIndex || startIndex < 0 || endIndex >= x.length) {
      console.warn(`Invalid integration range: startIndex=${startIndex}, endIndex=${endIndex}, x.length=${x.length}`);
      return returnWithBoundaries ? { area: 0, startX: 0, endX: 0 } : 0;
    }
    
    // Trapezoidal integration
    let area = 0;
    for (let i = startIndex; i < endIndex; i++) {
      if (i + 1 < x.length) {
        const dx = x[i + 1] - x[i];
        const avgY = (y[i] + y[i + 1]) / 2;
        area += avgY * dx;
      }
    }
    
    const result = Math.abs(area);
    console.log(`Calculated integration area: ${result}`);
    
    if (returnWithBoundaries) {
      return {
        area: result,
        startX: x[startIndex],
        endX: x[endIndex]
      };
    }
    
    return result;
  }, [processedData]);

  // Automatically integrate all detected peaks
  const integrateAllPeaks = useCallback(async () => {
    const updatedPeaks = detectedPeaks.map(peak => {
      const result = calculatePeakArea(peak, undefined, true) as { area: number; startX: number; endX: number };
      return {
        ...peak,
        integrationArea: result.area,
        integrationStart: peak.integrationStart || result.startX,
        integrationEnd: peak.integrationEnd || result.endX,
        manuallyAdjusted: peak.manuallyAdjusted || false
      };
    });
    
    setDetectedPeaks(updatedPeaks);
    setHasUnsavedChanges(true);
  }, [detectedPeaks, calculatePeakArea]);

  // Save all current analysis results to database
  const saveAllAnalysisResults = useCallback(async () => {
    if (!spectrum?.id) {
      showSaveNotification('No spectrum available for saving analysis', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const savedResults: any = {};

      // Save baseline correction if applied
      if (baselinePoints.length > 0) {
        const baselineAnalysis = await saveAnalysisToDatabase(
          'baseline_correction',
          baselineParams,
          {
            original_intensities: originalData.y,
            corrected_intensities: processedData.y,
            baseline: baselinePoints.map(p => p.y),
            technique: spectrum.technique,
            data_mode: dataMode,
            applied: true
          },
          !!savedAnalyses.baselineCorrection
        );
        if (baselineAnalysis) savedResults.baselineCorrection = baselineAnalysis;
      }

      // Save peak detection if peaks detected
      if (detectedPeaks.length > 0) {
        const peakAnalysis = await saveAnalysisToDatabase(
          'peak_detection',
          peakParams,
          {
            peaks: detectedPeaks.map(peak => ({
              id: peak.id,
              position: peak.x,
              intensity: peak.y,
              width: peak.width,
              prominence: peak.prominence
            })),
            peak_count: detectedPeaks.length,
            technique: spectrum.technique,
            data_mode: dataMode
          },
          !!savedAnalyses.peakDetection
        );
        if (peakAnalysis) savedResults.peakDetection = peakAnalysis;
      }

      // Save integration results if any peaks have been integrated
      const integratedPeaks = detectedPeaks.filter(p => p.integrationArea !== undefined);
      if (integratedPeaks.length > 0) {
        const integrationAnalysis = await saveAnalysisToDatabase(
          'peak_integration',
          {
            method: 'mixed', // Can be auto or manual
            integration_type: 'trapezoidal'
          },
          {
            integrated_peaks: integratedPeaks.map(peak => ({
              id: peak.id,
              position: peak.x,
              intensity: peak.y,
              integration_area: peak.integrationArea,
              integration_start: peak.integrationStart,
              integration_end: peak.integrationEnd,
              manually_adjusted: peak.manuallyAdjusted
            })),
            total_integrated_peaks: integratedPeaks.length,
            technique: spectrum.technique,
            data_mode: dataMode
          },
          !!savedAnalyses.peakIntegration
        );
        if (integrationAnalysis) savedResults.peakIntegration = integrationAnalysis;
      }

      // Update saved analyses state
      setSavedAnalyses(savedResults);
      setHasUnsavedChanges(false);
      
      showSaveNotification(
        `Analysis results saved successfully! Saved ${Object.keys(savedResults).length} analysis type(s).`,
        'success'
      );
      console.log('All analysis results saved:', savedResults);
    } catch (error) {
      console.error('Failed to save analysis results:', error);
      
      // Show more detailed error information
      let errorMessage = 'Failed to save analysis results';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        console.error('Error details:', error.stack);
      } else {
        errorMessage += '. Unknown error occurred.';
        console.error('Unknown error:', error);
      }
      
      showSaveNotification(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    spectrum, 
    baselinePoints, 
    baselineParams, 
    originalData, 
    processedData, 
    dataMode, 
    detectedPeaks, 
    peakParams, 
    savedAnalyses, 
    saveAnalysisToDatabase,
    showSaveNotification
  ]);

  // Export peaks data as CSV
  const exportPeaksAsCSV = useCallback(async () => {
    if (detectedPeaks.length === 0) {
      showSaveNotification('No peaks detected to export', 'error');
      return;
    }

    try {
      const filename = `${spectrum?.filename || 'spectrum'}_detected_peaks.csv`;
      await apiService.exportPeaksAsCSV(detectedPeaks, filename);
      showSaveNotification('Peaks exported successfully as CSV', 'success');
      console.log('Peaks exported successfully as CSV');
    } catch (error) {
      console.error('Failed to export peaks as CSV:', error);
      showSaveNotification('Failed to export peaks data', 'error');
    }
  }, [detectedPeaks, spectrum?.filename, showSaveNotification]);

  // Plot data preparation
  const plotData = useMemo(() => {
    const traces: any[] = [];
    
    // Main spectrum trace
    traces.push({
      x: processedData.x,
      y: processedData.y,
      type: 'scatter',
      mode: 'lines',
      name: 'Spectrum',
      line: { color: '#1976d2', width: 2 }
    });
    
    // Baseline points (for manual mode)
    if (baselinePoints.length > 0) {
      traces.push({
        x: baselinePoints.map(p => p.x),
        y: baselinePoints.map(p => p.y),
        type: 'scatter',
        mode: 'markers+lines',
        name: 'Baseline',
        line: { color: '#f44336', width: 2, dash: 'dash' },
        marker: { color: '#f44336', size: 8 }
      });
    }
    
    // Detected peaks
    if (detectedPeaks.length > 0) {
      traces.push({
        x: detectedPeaks.map(p => p.x),
        y: detectedPeaks.map(p => p.y),
        type: 'scatter',
        mode: 'markers',
        name: 'Peaks',
        marker: {
          color: '#ff9800',
          size: 10,
          symbol: 'triangle-up'
        },
        text: detectedPeaks.map(p => 
          `Peak: ${p.x.toFixed(2)}${p.integrationArea ? `<br>Area: ${p.integrationArea.toFixed(2)}` : ''}`
        ),
        hovertemplate: '<b>Position:</b> %{x}<br><b>Intensity:</b> %{y}<br>%{text}<extra></extra>'
      });
    }
    
    // Integration areas (display for all peaks with integration results)
    detectedPeaks.forEach(peak => {
      if (peak.integrationArea) {
        traces.push({
          x: [peak.x],
          y: [peak.y + peak.y * 0.1],
          type: 'scatter',
          mode: 'text',
          text: [`Area: ${peak.integrationArea.toFixed(2)}`],
          textposition: 'top center',
          showlegend: false,
          textfont: { color: '#4caf50', size: 10 }
        });
      }
    });
    
    // Integration boundary lines for selected peak
    const selectedPeak = detectedPeaks.find(p => p.id === selectedPeakForBoundaries);
    if (selectedPeak && selectedPeak.integrationStart !== undefined && selectedPeak.integrationEnd !== undefined) {
      const maxY = Math.max(...processedData.y);
      const minY = Math.min(...processedData.y);
      
      // Start boundary line
      traces.push({
        x: [selectedPeak.integrationStart, selectedPeak.integrationStart],
        y: [minY, maxY],
        type: 'scatter',
        mode: 'lines',
        name: 'Integration Start',
        line: { 
          color: '#4caf50', 
          width: 3, 
          dash: 'dot' 
        },
        hovertemplate: '<b>Integration Start:</b> %{x}<extra></extra>',
        showlegend: false,
        hoverinfo: 'x'
      });
      
      // End boundary line
      traces.push({
        x: [selectedPeak.integrationEnd, selectedPeak.integrationEnd],
        y: [minY, maxY],
        type: 'scatter',
        mode: 'lines',
        name: 'Integration End',
        line: { 
          color: '#f44336', 
          width: 3, 
          dash: 'dot' 
        },
        hovertemplate: '<b>Integration End:</b> %{x}<extra></extra>',
        showlegend: false,
        hoverinfo: 'x'
      });
      
      // Integration area shading
      const { x: xData, y: yData } = processedData;
      const startIdx = xData.findIndex(x => x >= selectedPeak.integrationStart!);
      const endIdx = xData.findIndex(x => x >= selectedPeak.integrationEnd!);
      
      if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
        const integrationX = xData.slice(startIdx, endIdx + 1);
        const integrationY = yData.slice(startIdx, endIdx + 1);
        const baselineY = integrationX.map(() => Math.min(...yData));
        
        traces.push({
          x: [...integrationX, ...integrationX.slice().reverse()],
          y: [...integrationY, ...baselineY.reverse()],
          type: 'scatter',
          mode: 'none',
          fill: 'toself',
          fillcolor: 'rgba(76, 175, 80, 0.3)',
          name: 'Integration Area',
          showlegend: false,
          hoverinfo: 'skip'
        });
      }
    }
    
    return traces;
  }, [processedData, baselinePoints, detectedPeaks, selectedPeakForBoundaries]);

  // Plot layout
  const plotLayout = useMemo(() => {
    if (!spectrum) return {};
    
    const labels = (() => {
      const technique = spectrum.technique.toLowerCase();
      let xaxis = 'X-axis';
      let yaxis = 'Y-axis';
      
      // Set x-axis label - use converted unit if available, otherwise use technique default
      if (xAxisUnit) {
        xaxis = xAxisUnit.includes('(') ? xAxisUnit : `${xAxisUnit}`;
        // Ensure proper formatting for common units
        if (xAxisUnit === 'cm⁻¹') {
          xaxis = technique.includes('raman') ? 'Raman Shift (cm⁻¹)' : 'Wavenumber (cm⁻¹)';
        } else if (xAxisUnit.toLowerCase().includes('nm')) {
          xaxis = 'Wavelength (nm)';
        } else if (xAxisUnit.toLowerCase().includes('micrometer') || xAxisUnit.includes('μm')) {
          xaxis = 'Wavelength (μm)';
        }
      } else {
        // Fallback to technique-based labels
        switch (technique) {
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
          default:
            xaxis = 'X-axis';
        }
      }
      
      // Set y-axis label based on technique and data mode
      switch (technique) {
        case 'ir':
        case 'infrared':
        case 'uv-vis':
        case 'uv':
        case 'vis':
          if (dataMode === 'absorbance') {
            yaxis = 'Absorbance';
          } else {
            yaxis = 'Transmittance (%)';
          }
          break;
        case 'raman':
          yaxis = 'Intensity (counts)';
          break;
        default:
          yaxis = 'Y-axis';
      }
      
      return { xaxis, yaxis };
    })();
    
    // Add manual mode instructions to title
    const getTitle = () => {
      let baseTitle = `${spectrum.technique} Analysis - ${spectrum.filename}`;
      
      if (activeTool === 'baseline' && toolModes.baseline === 'manual') {
        baseTitle += ' • Click to add baseline points';
      } else if (activeTool === 'peak' && toolModes.peak === 'manual') {
        baseTitle += ' • Click to add peaks';
      } else if (selectedPeakForBoundaries) {
        if (boundaryAdjustmentStep === 'start') {
          baseTitle += ' • Click to set START boundary';
        } else if (boundaryAdjustmentStep === 'end') {
          baseTitle += ' • Click to set END boundary';
        } else {
          baseTitle += ' • Boundary adjustment mode';
        }
      }
      
      return baseTitle;
    };

    // Create annotations for detected peaks/valleys
    const peakAnnotations = detectedPeaks.length > 0 && processedData.y.length > 0 
      ? detectedPeaks.map((peak, index) => {
          const maxY = Math.max(...processedData.y);
          const minY = Math.min(...processedData.y);
          const yRange = maxY - minY;
          
          // Determine if we're in valley detection mode for UV-Vis/IR transmittance
          const isValleyMode = dataMode === 'transmittance' && 
            ['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(spectrum?.technique?.toLowerCase() || '');
          
          // Position label and arrow based on peak/valley mode
          let labelY, arrowStartY, arrowEndY;
          
          if (isValleyMode) {
            // For valleys, position label below the valley
            labelY = peak.y - yRange * 0.06; // Position label 6% of total range below valley
            arrowStartY = peak.y - yRange * 0.01; // Arrow start position slightly below valley
            arrowEndY = labelY + yRange * 0.01; // Arrow end position closer to label
          } else {
            // For peaks, position label above the peak (original behavior)
            labelY = peak.y + yRange * 0.06; // Position label 6% of total range above peak
            arrowStartY = peak.y + yRange * 0.01; // Arrow start position slightly above peak
            arrowEndY = labelY - yRange * 0.01; // Arrow end position closer to label
          }
      
      return [
        // Arrow pointing to peak/valley
        {
          x: peak.x,
          y: arrowStartY,
          xref: 'x',
          yref: 'y',
          ax: peak.x,
          ay: arrowEndY,
          axref: 'x',
          ayref: 'y',
          arrowhead: 2,
          arrowsize: 1.5,
          arrowwidth: 2,
          arrowcolor: isValleyMode ? '#6b9eff' : '#ff6b6b', // Blue for valleys, red for peaks
          showarrow: true,
          text: '',
          bgcolor: 'rgba(0,0,0,0)',
          bordercolor: 'rgba(0,0,0,0)'
        },
        // Text label with x-axis value
        {
          x: peak.x,
          y: labelY,
          xref: 'x',
          yref: 'y',
          text: `<b>${peak.x.toFixed(2)}</b>`,
          showarrow: false,
          font: {
            color: '#2c3e50',
            size: 20,
            family: 'Arial, sans-serif'
          },
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          bordercolor: 'rgba(0,0,0,0)',
          borderwidth: 0,
          borderpad: 4,
          xanchor: 'center',
          yanchor: 'middle'
        }
      ];
    }).flat() : [];

    return {
      title: getTitle(),
      xaxis: {
        title: labels.xaxis,
        showgrid: true,
        gridcolor: '#f0f0f0',
        // For IR spectra, reverse the axis so high wavenumbers are on the left
        autorange: spectrum.technique.toLowerCase().includes('ir') ? 'reversed' : true
      },
      yaxis: {
        title: labels.yaxis,
        showgrid: true,
        gridcolor: '#f0f0f0'
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      margin: { t: 50, r: 30, b: 50, l: 80 },
      showlegend: true,
      hovermode: 'closest' as any,
      annotations: peakAnnotations
    };
  }, [spectrum, activeTool, toolModes, detectedPeaks, processedData, dataMode, xAxisUnit, selectedPeakForBoundaries, boundaryAdjustmentStep]);

  // Handle boundary adjustment and recalculate integration
  const updatePeakBoundary = useCallback((peakId: string, boundaryType: 'start' | 'end', newValue: number) => {
    console.log(`Updating boundary: ${boundaryType} = ${newValue} for peak ${peakId}`);
    
    // Update boundary first
    setDetectedPeaks(prev => {
      return prev.map(peak => {
        if (peak.id === peakId) {
          const updatedPeak = {
            ...peak,
            [boundaryType === 'start' ? 'integrationStart' : 'integrationEnd']: newValue,
            manuallyAdjusted: true
          };
          
          console.log(`Updated peak boundaries:`, {
            start: updatedPeak.integrationStart,
            end: updatedPeak.integrationEnd,
            peakX: updatedPeak.x
          });
          
          return updatedPeak;
        }
        return peak;
      });
    });
  }, []);

  // Create a ref to always access current processedData
  const processedDataRef = useRef(processedData);
  
  // Update ref whenever processedData changes
  useEffect(() => {
    processedDataRef.current = processedData;
  }, [processedData]);
  
  // Separate function to recalculate integration using ref to avoid stale closure
  const recalculateIntegrationForPeak = useCallback((peakId: string) => {
    console.log(`Starting recalculation for peak ${peakId}`);
    
    // Get current data from ref - this is ALWAYS fresh
    const currentData = processedDataRef.current;
    console.log(`Current processedData from ref:`, { 
      xLength: currentData.x.length, 
      yLength: currentData.y.length,
      xRange: `${currentData.x[0]?.toFixed(2)} to ${currentData.x[currentData.x.length-1]?.toFixed(2)}`
    });
    
    setDetectedPeaks(currentPeaks => {
      return currentPeaks.map(currentPeak => {
        if (currentPeak.id === peakId && currentPeak.integrationStart !== undefined && currentPeak.integrationEnd !== undefined) {
          console.log(`Recalculating integration for peak ${peakId} with boundaries:`, {
            start: currentPeak.integrationStart,
            end: currentPeak.integrationEnd
          });
          
          // Use data from ref - always current
          const { x, y } = currentData;
          
          console.log(`Using FRESH data from ref with ${x.length} points, range: ${x[0]?.toFixed(2)} to ${x[x.length-1]?.toFixed(2)}`);
          
          let startIndex = 0;
          let endIndex = x.length - 1;
          
          // Check if x-axis is ascending or descending
          const isAscending = x[0] < x[x.length - 1];
          console.log(`X-axis direction: ${isAscending ? 'ascending' : 'descending'} (${x[0].toFixed(2)} to ${x[x.length-1].toFixed(2)})`);
          
          if (isAscending) {
            // For ascending x (UV-Vis, Raman, etc.)
            // Find start index - first point >= start boundary
            for (let i = 0; i < x.length; i++) {
              if (x[i] >= currentPeak.integrationStart) {
                startIndex = i;
                break;
              }
            }
            
            // Find end index - last point <= end boundary
            for (let i = x.length - 1; i >= 0; i--) {
              if (x[i] <= currentPeak.integrationEnd) {
                endIndex = i;
                break;
              }
            }
          } else {
            // For descending x (IR spectra: high wavenumber to low wavenumber)
            // Find start index - first point <= start boundary (highest wavenumber)
            for (let i = 0; i < x.length; i++) {
              if (x[i] <= Math.max(currentPeak.integrationStart, currentPeak.integrationEnd)) {
                startIndex = i;
                break;
              }
            }
            
            // Find end index - last point >= end boundary (lowest wavenumber)
            for (let i = x.length - 1; i >= 0; i--) {
              if (x[i] >= Math.min(currentPeak.integrationStart, currentPeak.integrationEnd)) {
                endIndex = i;
                break;
              }
            }
          }
          
          // Ensure valid range
          if (startIndex >= endIndex) {
            console.warn(`Invalid range detected: startIndex=${startIndex}, endIndex=${endIndex}`);
            if (startIndex > 0) startIndex = startIndex - 1;
            if (endIndex < x.length - 1) endIndex = endIndex + 1;
          }
          
          console.log(`Integration indices: ${startIndex} to ${endIndex} (x: ${x[startIndex]?.toFixed(2)} to ${x[endIndex]?.toFixed(2)})`);
          
          // Trapezoidal integration with detailed logging
          let area = 0;
          let pointCount = 0;
          for (let i = startIndex; i < endIndex; i++) {
            if (i + 1 < x.length) {
              const dx = x[i + 1] - x[i];
              const avgY = (y[i] + y[i + 1]) / 2;
              const contribution = avgY * dx;
              area += contribution;
              pointCount++;
              
              // Log first few and last few points for debugging
              if (pointCount <= 3 || pointCount > (endIndex - startIndex - 3)) {
                console.log(`  Point ${i}: x=${x[i].toFixed(2)}, y=${y[i].toFixed(4)}, dx=${dx.toFixed(4)}, avgY=${avgY.toFixed(4)}, contribution=${contribution.toFixed(4)}`);
              }
            }
          }
          
          const newArea = Math.abs(area);
          console.log(`FINAL integration result: ${newArea} (raw: ${area}) from ${pointCount} points`);
          
          return { ...currentPeak, integrationArea: newArea, manuallyAdjusted: true };
        }
        return currentPeak;
      });
    });
  }, []); // No dependencies - we use ref instead

  // Plot event handlers
  const handlePlotClick = useCallback((event: any) => {
    if (!event.points || event.points.length === 0) return;
    
    const point = event.points[0];
    const { x, y } = point;
    const clickedTrace = event.points[0];
    
    // Handle boundary adjustment with two-click system
    if (selectedPeakForBoundaries && clickedTrace.data.name === 'Spectrum') {
      const selectedPeak = detectedPeaks.find(p => p.id === selectedPeakForBoundaries);
      if (selectedPeak && selectedPeak.integrationStart !== undefined && selectedPeak.integrationEnd !== undefined) {
        
        // Two-click system: first click sets start, second click sets end
        if (boundaryAdjustmentStep === null || boundaryAdjustmentStep === 'start') {
          // First click: set start boundary
          updatePeakBoundary(selectedPeakForBoundaries, 'start', x);
          setBoundaryAdjustmentStep('end');
          setIntegrationMessage(`Start boundary set at ${x.toFixed(2)}. Click again to set end boundary.`);
          console.log('Set start boundary to:', x);
          
          // Clear message after 3 seconds if user doesn't click again
          setTimeout(() => {
            setIntegrationMessage(prev => 
              prev.includes('Start boundary set') ? '' : prev
            );
          }, 3000);
          
          return;
        } else if (boundaryAdjustmentStep === 'end') {
          // Second click: set end boundary
          const startBoundary = selectedPeak.integrationStart;
          
          // Ensure end boundary is different from start boundary
          if (Math.abs(x - startBoundary) < 0.01) {
            setIntegrationMessage('End boundary must be different from start boundary. Please click elsewhere.');
            setTimeout(() => setIntegrationMessage(''), 2000);
            return;
          }
          
          // Determine final boundaries (swap if necessary)
          let finalStart = Math.min(startBoundary, x);
          let finalEnd = Math.max(startBoundary, x);
          
          console.log(`Before swap: start=${startBoundary}, end=${x}`);
          console.log(`After swap: finalStart=${finalStart}, finalEnd=${finalEnd}`);
          
          // Update both boundaries to ensure they're in the correct order
          updatePeakBoundary(selectedPeakForBoundaries, 'start', finalStart);
          updatePeakBoundary(selectedPeakForBoundaries, 'end', finalEnd);
          setBoundaryAdjustmentStep(null);
          
          // Recalculate integration with the new boundaries
          setTimeout(() => {
            recalculateIntegrationForPeak(selectedPeakForBoundaries);
            
            // Show completion message after recalculation
            setTimeout(() => {
              setDetectedPeaks(currentPeaks => {
                const updatedPeak = currentPeaks.find(p => p.id === selectedPeakForBoundaries);
                const newArea = updatedPeak?.integrationArea || 0;
                
                setIntegrationMessage(
                  `New integration range set: ${finalStart.toFixed(2)} to ${finalEnd.toFixed(2)} (Area: ${newArea.toFixed(2)})`
                );
                console.log(`Set integration range: ${finalStart} to ${finalEnd}, Area: ${newArea}`);
                setHasUnsavedChanges(true);
                
                return currentPeaks; // Return unchanged peaks
              });
              
              // Clear message after 5 seconds
              setTimeout(() => setIntegrationMessage(''), 5000);
            }, 100); // Wait for recalculation to complete
          }, 50); // Small delay to ensure boundary state is updated
          
          return;
        }
      }
    }
    
    // Handle manual baseline and peak tools
    if (activeTool === 'baseline' && toolModes.baseline === 'manual') {
      setBaselinePoints(prev => [...prev, { x, y }]);
    } else if (activeTool === 'peak' && toolModes.peak === 'manual') {
      const newPeak: Peak = {
        id: `manual_peak_${Date.now()}`,
        x,
        y,
        prominence: 0
      };
      setDetectedPeaks(prev => [...prev, newPeak]);
    }
  }, [activeTool, toolModes, selectedPeakForBoundaries, detectedPeaks, updatePeakBoundary, boundaryAdjustmentStep, recalculateIntegrationForPeak]);


  // Sidebar resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Increased minimum width to accommodate the wider peaks table with new columns
    const minWidth = 420; // Increased from 280 to fit Integration and Actions columns
    const maxWidth = 700; // Increased from 600 to allow more space if needed
    const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
    setSidebarWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!spectrum) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No spectrum selected for analysis. Please select a spectrum from the Spectra page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Tools Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={toolsDrawerOpen}
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            position: 'relative'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Analysis Tools
          </Typography>
          <Chip 
            label={spectrum.technique} 
            color="primary" 
            size="small" 
            sx={{ mb: 2 }}
          />
          
          {/* Common Tools */}
          <Typography variant="subtitle2" gutterBottom>
            Common Tools
          </Typography>
          <List dense>
            {availableTools.common.map((tool) => (
              <ListItem
                key={tool.id}
                button
                selected={activeTool === tool.id}
                onClick={() => setActiveTool(tool.id as any)}
              >
                <ListItemIcon>
                  <tool.icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={tool.name} />
              </ListItem>
            ))}
          </List>
          
          {/* Technique-Specific Tools */}
          {availableTools.specific.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                {spectrum.technique} Tools
              </Typography>
              <List dense>
                {availableTools.specific.map((tool: any) => (
                  <ListItem key={tool.id} button>
                    <ListItemText primary={tool.name} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          
          {/* Tool Parameters */}
          {activeTool && (
            <>
              <Divider sx={{ my: 2 }} />
              
              {/* Tool-Specific Mode Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block', fontSize: '22px' }}>
                  {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Mode
                </Typography>
                <ButtonGroup fullWidth size="small">
                  <Button 
                    variant={toolModes[activeTool] === 'auto' ? 'contained' : 'outlined'}
                    onClick={() => setToolMode(activeTool, 'auto')}
                    startIcon={<AutoIcon />}
                  >
                    Auto
                  </Button>
                  <Button 
                    variant={toolModes[activeTool] === 'manual' ? 'contained' : 'outlined'}
                    onClick={() => setToolMode(activeTool, 'manual')}
                    startIcon={<ManualIcon />}
                  >
                    Manual
                  </Button>
                </ButtonGroup>
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>
                Parameters
              </Typography>
              
              {activeTool === 'baseline' && toolModes.baseline === 'auto' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Auto Baseline Correction Parameters
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={baselineParams.method}
                      onChange={(e) => setBaselineParams(prev => ({ ...prev, method: e.target.value }))}
                    >
                      <MenuItem value="als">Asymmetric Least Squares (ALS)</MenuItem>
                      <MenuItem value="polynomial">Polynomial Fitting</MenuItem>
                      <MenuItem value="linear">Linear Interpolation</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {baselineParams.method === 'als' && (
                    <>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption">
                          Lambda (Smoothness): {baselineParams.lambda.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ fontSize: '0.7rem' }}>
                          Higher = smoother baseline
                        </Typography>
                        <Slider
                          value={baselineParams.lambda}
                          onChange={(_, value) => setBaselineParams(prev => ({ ...prev, lambda: value as number }))}
                          min={(() => {
                            const rec = getRecommendedLambda(spectrum?.technique || 'default');
                            return rec.min;
                          })()}
                          max={(() => {
                            const rec = getRecommendedLambda(spectrum?.technique || 'default');
                            return rec.max;
                          })()}
                          step={100}
                          scale={(value) => value}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption">
                          Asymmetry (p): {baselineParams.p}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ fontSize: '0.7rem' }}>
                          Lower = more asymmetric (0.001-0.1)
                        </Typography>
                        <Slider
                          value={baselineParams.p}
                          onChange={(_, value) => setBaselineParams(prev => ({ ...prev, p: value as number }))}
                          min={0.001}
                          max={0.1}
                          step={0.001}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption">
                          Iterations: {baselineParams.iterations}
                        </Typography>
                        <Slider
                          value={baselineParams.iterations}
                          onChange={(_, value) => setBaselineParams(prev => ({ ...prev, iterations: value as number }))}
                          min={5}
                          max={20}
                          step={1}
                          size="small"
                        />
                      </Box>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={baselineParams.useSimplified}
                            onChange={(e) => setBaselineParams(prev => ({ ...prev, useSimplified: e.target.checked }))}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="caption">
                            Use simplified ALS (faster for large datasets)
                          </Typography>
                        }
                      />
                    </>
                  )}
                  
                  {baselineParams.method === 'polynomial' && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption">
                        Polynomial Degree: {baselineParams.degree || 3}
                      </Typography>
                      <Slider
                        value={baselineParams.degree || 3}
                        onChange={(_, value) => setBaselineParams(prev => ({ ...prev, degree: value as number }))}
                        min={1}
                        max={6}
                        step={1}
                        size="small"
                      />
                    </Box>
                  )}
                  
                  {/* Information box for ALS parameters */}
                  {baselineParams.method === 'als' && (
                    <Alert severity="info" sx={{ mb: 1, fontSize: '0.75rem' }}>
                      <Typography variant="caption" display="block">
                        <strong>Technique: {spectrum?.technique || 'Unknown'}</strong>
                      </Typography>
                      <Typography variant="caption" display="block">
                        Recommended λ range: {getRecommendedLambda(spectrum?.technique || 'default').min.toLocaleString()} - {getRecommendedLambda(spectrum?.technique || 'default').max.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        • Start with default values<br/>
                        • Increase λ if baseline follows peaks<br/>
                        • Decrease λ for complex baselines
                      </Typography>
                    </Alert>
                  )}
                  
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => performBaselineCorrection(baselineParams.method, baselineParams)}
                    disabled={isProcessing}
                    sx={{ mb: 1 }}
                  >
                    {isProcessing ? 'Processing...' : 'Apply Baseline Correction'}
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setProcessedData(originalData);
                      setBaselinePoints([]);
                      // Reset to technique-specific defaults
                      const technique = spectrum?.technique || 'default';
                      const lambdaRec = getRecommendedLambda(technique);
                      setBaselineParams(prev => ({
                        ...prev,
                        lambda: lambdaRec.default,
                        p: 0.01,
                        iterations: 10,
                        useSimplified: false
                      }));
                    }}
                  >
                    Reset to Original
                  </Button>
                </Box>
              )}

              {activeTool === 'baseline' && toolModes.baseline === 'manual' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Manual Baseline Correction
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Click on the spectrum plot to add baseline points. Click from left to right or right to left to create a baseline curve.
                  </Typography>
                  
                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                    Baseline Points: {baselinePoints.length}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Apply manual baseline correction using the selected points
                        if (baselinePoints.length >= 2) {
                          const { x: originalX, y: originalY } = originalData;
                          const sortedPoints = [...baselinePoints].sort((a, b) => a.x - b.x);
                          
                          // Create baseline by linear interpolation between points
                          const baseline = originalX.map((x) => {
                            if (x <= sortedPoints[0].x) return sortedPoints[0].y;
                            if (x >= sortedPoints[sortedPoints.length - 1].x) return sortedPoints[sortedPoints.length - 1].y;
                            
                            // Find surrounding points
                            for (let i = 0; i < sortedPoints.length - 1; i++) {
                              if (x >= sortedPoints[i].x && x <= sortedPoints[i + 1].x) {
                                const ratio = (x - sortedPoints[i].x) / (sortedPoints[i + 1].x - sortedPoints[i].x);
                                return sortedPoints[i].y + ratio * (sortedPoints[i + 1].y - sortedPoints[i].y);
                              }
                            }
                            return sortedPoints[0].y;
                          });
                          
                          // Subtract baseline from original data
                          const corrected = originalY.map((y, i) => y - baseline[i]);
                          setProcessedData({ x: originalX, y: corrected });
                        }
                      }}
                      disabled={baselinePoints.length < 2}
                    >
                      Apply Manual Baseline
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setBaselinePoints([])}
                      disabled={baselinePoints.length === 0}
                    >
                      Clear Points
                    </Button>
                  </Box>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setProcessedData(originalData);
                      setBaselinePoints([]);
                    }}
                  >
                    Reset to Original
                  </Button>
                </Box>
              )}
              
              {activeTool === 'peak' && toolModes.peak === 'auto' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Auto Peak Detection Parameters
                  </Typography>
                  
                  {/* Show current detection mode for UV-Vis and IR */}
                  {['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(spectrum?.technique?.toLowerCase() || '') && (
                    <Alert severity="info" sx={{ mb: 1, fontSize: '0.75rem' }}>
                      <Typography variant="caption" display="block">
                        <strong>Current Mode:</strong> Detecting {
                          dataMode === 'transmittance' ? 'valleys (absorption bands)' : 'peaks'
                        } for {spectrum.technique} {dataMode} data
                      </Typography>
                      {spectrum?.acquisition_parameters?.YUNITS && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          Mode auto-detected from YUNITS: {spectrum.acquisition_parameters.YUNITS}
                        </Typography>
                      )}
                    </Alert>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption">Prominence: {(peakParams.prominence * 100).toFixed(1)}%</Typography>
                    <Slider
                      value={peakParams.prominence}
                      onChange={(_, value) => setPeakParams(prev => ({ ...prev, prominence: value as number }))}
                      min={0.01}
                      max={0.5}
                      step={0.01}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption">Min Width: {peakParams.width} points</Typography>
                    <Slider
                      value={peakParams.width}
                      onChange={(_, value) => setPeakParams(prev => ({ ...prev, width: value as number }))}
                      min={1}
                      max={20}
                      step={1}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption">Min Distance: {peakParams.distance} points</Typography>
                    <Slider
                      value={peakParams.distance}
                      onChange={(_, value) => setPeakParams(prev => ({ ...prev, distance: value as number }))}
                      min={1}
                      max={30}
                      step={1}
                      size="small"
                    />
                  </Box>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => performPeakDetection(peakParams)}
                    disabled={isProcessing}
                  >
                    Detect Peaks
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setDetectedPeaks([]);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Clear Peaks
                  </Button>
                </Box>
              )}

              {activeTool === 'peak' && toolModes.peak === 'manual' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Manual Peak Detection
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Click on the spectrum plot to manually add peaks at desired positions.
                  </Typography>
                  
                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                    Manual Peaks: {detectedPeaks.filter(p => p.id.startsWith('manual_peak')).length}
                  </Typography>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setDetectedPeaks(prev => prev.filter(p => !p.id.startsWith('manual_peak')));
                    }}
                    disabled={detectedPeaks.filter(p => p.id.startsWith('manual_peak')).length === 0}
                  >
                    Clear Manual Peaks
                  </Button>
                </Box>
              )}
              
              {activeTool === 'integration' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Automatic Peak Integration
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Automatically integrate all detected peaks using trapezoidal method. Integration areas will be displayed in the peaks table. Click on integrated peaks in the table to visualize and manually adjust integration boundaries.
                  </Typography>
                  
                  {detectedPeaks.length > 0 ? (
                    <>
                      <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                        <Typography variant="caption" display="block">
                          <strong>{detectedPeaks.length} peaks detected</strong>
                        </Typography>
                        <Typography variant="caption" display="block">
                          Integration width is automatically determined based on detected peak width or uses default values.
                        </Typography>
                        {selectedPeakForBoundaries && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 'bold', color: '#1976d2' }}>
                            {boundaryAdjustmentStep === 'start' 
                              ? 'Step 1: Click on spectrum to set START boundary'
                              : boundaryAdjustmentStep === 'end'
                              ? 'Step 2: Click on spectrum to set END boundary'
                              : 'Peak selected for boundary adjustment'
                            }
                          </Typography>
                        )}
                        
                        {integrationMessage && (
                          <Typography variant="caption" display="block" sx={{ 
                            mt: 0.5, 
                            fontWeight: 'bold', 
                            color: integrationMessage.includes('New integration range') ? '#4caf50' : '#ff9800',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            padding: 0.5,
                            borderRadius: 1
                          }}>
                            {integrationMessage}
                          </Typography>
                        )}
                      </Alert>
                      
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={integrateAllPeaks}
                        disabled={isProcessing}
                        sx={{ mb: 1 }}
                      >
                        {isProcessing ? 'Integrating...' : 'Integrate All Peaks'}
                      </Button>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {selectedPeakForBoundaries && (
                          <Button
                            variant="outlined"
                            color="warning"
                            onClick={() => {
                              setSelectedPeakForBoundaries(null);
                              setBoundaryAdjustmentStep(null);
                              setIntegrationMessage('');
                            }}
                            sx={{ flex: 1 }}
                          >
                            Cancel Adjustment
                          </Button>
                        )}
                        
                        <Button
                          fullWidth={!selectedPeakForBoundaries}
                          variant="outlined"
                          onClick={() => {
                            // Clear integration results from peaks
                            const clearedPeaks = detectedPeaks.map(peak => ({
                              ...peak,
                              integrationArea: undefined
                            }));
                            setDetectedPeaks(clearedPeaks);
                            setSelectedPeakForBoundaries(null);
                            setBoundaryAdjustmentStep(null);
                            setIntegrationMessage('');
                          }}
                          disabled={!detectedPeaks.some(p => p.integrationArea)}
                          sx={{ flex: selectedPeakForBoundaries ? 1 : 'unset' }}
                        >
                          Clear All Results
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      No peaks detected. Please run peak detection first.
                    </Alert>
                  )}
                </Box>
              )}
            </>
          )}
          
          {/* Peak List Table - Bottom of Sidebar */}
          {detectedPeaks.length > 0 && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Detected Peaks ({detectedPeaks.length})
                </Typography>
                <Tooltip title="Export peaks data as CSV">
                  <IconButton
                    size="small"
                    onClick={exportPeaksAsCSV}
                    disabled={detectedPeaks.length === 0}
                    sx={{ 
                      ml: 1,
                      color: detectedPeaks.length > 0 ? 'primary.main' : 'grey.400'
                    }}
                  >
                    <ExportIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {(() => {
                          if (!spectrum) return 'Position';
                          
                          // Use actual x-axis unit if available
                          if (xAxisUnit) {
                            if (xAxisUnit === 'cm⁻¹') {
                              return spectrum.technique.toLowerCase().includes('raman') ? 'Raman Shift' : 'Wavenumber';
                            } else if (xAxisUnit.toLowerCase().includes('nm') || xAxisUnit.toLowerCase().includes('nanometer')) {
                              return 'Wavelength';
                            } else if (xAxisUnit.toLowerCase().includes('μm') || xAxisUnit.toLowerCase().includes('micrometer')) {
                              return 'Wavelength';
                            }
                          }
                          
                          // Fallback to technique-based labels
                          switch (spectrum.technique.toLowerCase()) {
                            case 'ir':
                            case 'infrared':
                              return 'Wavenumber';
                            case 'raman':
                              return 'Raman Shift';
                            case 'uv-vis':
                            case 'uv':
                            case 'vis':
                              return 'Wavelength';
                            default:
                              return 'Position';
                          }
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {(() => {
                          if (!spectrum) return 'Y-axis';
                          const technique = spectrum.technique.toLowerCase();
                          
                          switch (technique) {
                            case 'ir':
                            case 'infrared':
                            case 'uv-vis':
                            case 'uv':
                            case 'vis':
                              return dataMode === 'absorbance' ? 'Absorbance' : 'Transmittance (%)';
                            case 'raman':
                              return 'Intensity';
                            default:
                              return 'Y-axis';
                          }
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Prominence</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Integration</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detectedPeaks
                      .sort((a, b) => {
                        // For IR spectra, sort high to low (conventional IR reading order)
                        // For other spectra, sort low to high
                        const isIR = spectrum?.technique?.toLowerCase().includes('ir') || 
                                    spectrum?.technique?.toLowerCase().includes('infrared');
                        return isIR ? b.x - a.x : a.x - b.x;
                      })
                      .map((peak, index) => (
                      <TableRow 
                        key={peak.id}
                        sx={{ 
                          '&:hover': { backgroundColor: '#f5f5f5' },
                          backgroundColor: selectedPeakForBoundaries === peak.id ? '#e3f2fd' : 'inherit',
                          cursor: peak.integrationArea ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                          if (peak.integrationArea) {
                            // Toggle selection - if already selected, deselect; otherwise select
                            if (selectedPeakForBoundaries === peak.id) {
                              setSelectedPeakForBoundaries(null);
                              setBoundaryAdjustmentStep(null);
                              setIntegrationMessage('');
                            } else {
                              setSelectedPeakForBoundaries(peak.id);
                              setBoundaryAdjustmentStep('start');
                              setIntegrationMessage('Peak selected. Click on spectrum to set start boundary.');
                            }
                          }
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                          {peak.x.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                          {peak.y.toFixed(3)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                          {peak.prominence ? peak.prominence.toFixed(2) : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                          {peak.integrationArea ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip 
                                label={peak.integrationArea.toFixed(2)} 
                                size="small" 
                                color={peak.manuallyAdjusted ? "warning" : "success"}
                                variant="filled"
                                sx={{ height: '20px', fontSize: '0.7rem' }}
                              />
                              {peak.manuallyAdjusted && (
                                <Tooltip title="Integration boundaries manually adjusted">
                                  <Chip 
                                    label="M" 
                                    size="small" 
                                    color="warning" 
                                    variant="outlined"
                                    sx={{ 
                                      height: '16px', 
                                      fontSize: '0.6rem', 
                                      minWidth: '20px',
                                      '& .MuiChip-label': { px: 0.5 }
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              Not integrated
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                          <Tooltip title="Delete peak">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetectedPeaks(prev => prev.filter(p => p.id !== peak.id));
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {/* Save Analysis Results Button */}
          <Box sx={{ 
            position: 'sticky', 
            bottom: 0, 
            bgcolor: 'background.paper', 
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
            mt: 'auto'
          }}>
            <Button
              fullWidth
              variant="contained"
              color={hasUnsavedChanges ? "primary" : "success"}
              onClick={saveAllAnalysisResults}
              disabled={isSaving || (!baselinePoints.length && !detectedPeaks.length)}
              startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
              sx={{
                fontWeight: 'bold',
                textTransform: 'none',
                py: 1.2
              }}
            >
              {isSaving 
                ? 'Saving...' 
                : hasUnsavedChanges 
                  ? 'Save Analysis Results' 
                  : 'Analysis Results Saved'
              }
            </Button>
            
            {/* Save Notification - appears right below the button */}
            {saveNotification.show && (
              <Box sx={{ mt: 1 }}>
                <Alert 
                  severity={saveNotification.type}
                  onClose={() => setSaveNotification(prev => ({ ...prev, show: false }))}
                  sx={{
                    fontSize: '0.75rem',
                    '& .MuiAlert-message': {
                      fontSize: '0.75rem',
                      py: 0.5
                    },
                    '& .MuiAlert-icon': {
                      fontSize: '1rem'
                    },
                    '& .MuiAlert-action': {
                      '& .MuiIconButton-root': {
                        padding: '2px'
                      }
                    }
                  }}
                >
                  {saveNotification.message}
                </Alert>
              </Box>
            )}
            
            {!saveNotification.show && hasUnsavedChanges && (
              <Typography 
                variant="caption" 
                color="warning.main" 
                sx={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  mt: 0.5,
                  fontStyle: 'italic'
                }}
              >
                • Unsaved changes detected
              </Typography>
            )}
            
            {!saveNotification.show && savedAnalyses && Object.keys(savedAnalyses).length > 0 && !hasUnsavedChanges && (
              <Typography 
                variant="caption" 
                color="success.main" 
                sx={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  mt: 0.5,
                  fontStyle: 'italic'
                }}
              >
                ✓ {Object.keys(savedAnalyses).length} analysis type(s) saved
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Resize Handle */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 4,
            height: '100%',
            cursor: 'col-resize',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: '#1976d2',
              opacity: 0.5
            },
            transition: 'background-color 0.2s ease',
            zIndex: 1000
          }}
        />
      </Drawer>
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Back to Spectra (ESC)">
              <IconButton 
                onClick={() => navigate('/spectra')}
                sx={{ mr: 1 }}
                color="primary"
              >
                <BackIcon />
              </IconButton>
            </Tooltip>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h1">
                Analysis - {spectrum.filename}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {spectrum.technique} • {processedData.x.length} data points
                {unitConversionInfo && (
                  <><br/><em>{unitConversionInfo}</em></>
                )}
              </Typography>
            </Box>
            
            {/* Data Mode Toggle for UV-Vis and IR */}
            {['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(spectrum.technique.toLowerCase()) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Display Mode:
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  <Button
                    variant={dataMode === 'absorbance' ? 'contained' : 'outlined'}
                    onClick={() => handleDataModeChange('absorbance')}
                    sx={{ minWidth: 100 }}
                  >
                    Absorbance
                  </Button>
                  <Button
                    variant={dataMode === 'transmittance' ? 'contained' : 'outlined'}
                    onClick={() => handleDataModeChange('transmittance')}
                    sx={{ minWidth: 110 }}
                  >
                    Transmittance
                  </Button>
                </ButtonGroup>
              </Box>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Help & Shortcuts (F1)">
              <IconButton 
                onClick={() => setHelpDialogOpen(true)}
                color="info"
              >
                <HelpIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Home Dashboard (Ctrl+H)">
              <IconButton 
                onClick={() => navigate('/')}
                color="primary"
              >
                <HomeIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Close Analysis (ESC)">
              <IconButton 
                onClick={() => navigate('/spectra')}
                color="secondary"
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Toggle Tools Panel (Ctrl+B)">
              <IconButton onClick={() => setToolsDrawerOpen(!toolsDrawerOpen)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Plot Area */}
        <Box sx={{ flexGrow: 1, p: 2 }}>
          <Paper sx={{ height: '100%', p: 1 }}>
            <Plot
              data={plotData}
              layout={plotLayout}
              config={{
                displayModeBar: true,
                modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                responsive: true,
                scrollZoom: true
              }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
              onClick={handlePlotClick}
            />
          </Paper>
        </Box>
        
      </Box>
      
      {/* Help Dialog */}
      <Dialog 
        open={helpDialogOpen} 
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Analysis Page Help & Keyboard Shortcuts
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h6" gutterBottom>
              Navigation
            </Typography>
            <Box sx={{ mb: 2, ml: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>ESC</strong> - Back to Spectra page
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Ctrl/Cmd + H</strong> - Go to Dashboard
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>F1 or ?</strong> - Show this help dialog
              </Typography>
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Analysis Tools
            </Typography>
            <Box sx={{ mb: 2, ml: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Ctrl/Cmd + B</strong> - Toggle tools panel
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Click on spectrum</strong> - Manual baseline/peak selection (when in manual mode)
              </Typography>
              {['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(spectrum?.technique?.toLowerCase() || '') && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Display Mode Toggle</strong> - Switch between Absorbance and Transmittance display
                </Typography>
              )}
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Analysis Workflow
            </Typography>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                1. <strong>Baseline Correction</strong> - Remove background signal
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                2. <strong>Peak Detection</strong> - Find peaks in the spectrum
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                3. <strong>Integration</strong> - Calculate areas under peaks
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                4. <strong>Boundary Adjustment</strong> - Click integrated peaks in table to show boundaries, then drag boundary lines to adjust
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                5. <strong>Export Results</strong> - Save analysis data as CSV
              </Typography>
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                Tip: Use Auto mode for quick analysis, Manual mode for precise control. 
                The red dashed line shows the calculated baseline.
                {['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(spectrum?.technique?.toLowerCase() || '') && (
                  <><br/>For UV-Vis and IR spectra, you can switch between Absorbance and Transmittance display modes using the toggle in the header.</>
                )}
                {unitConversionInfo && (
                  <><br/>X-axis units: {unitConversionInfo}</>
                )}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Analysis;