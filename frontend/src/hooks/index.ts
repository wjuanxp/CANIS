import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotificationStore } from '../services/store';
import { getErrorMessage } from '../utils';

// Generic async hook for API calls
export const useAsync = <T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch };
};

// File upload hook
export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  const uploadFile = async (
    file: File,
    uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadFunction(file, setProgress);
      addNotification({
        type: 'success',
        message: `File "${file.name}" uploaded successfully`,
      });
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: `Failed to upload "${file.name}": ${errorMessage}`,
      });
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploading, progress, error, uploadFile };
};

// Local storage hook
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
};

// Debounced value hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Previous value hook
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

// Window size hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// Click outside hook
export const useClickOutside = (
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler]);
};

// Form validation hook
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, (value: any) => string | null>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as Record<keyof T, string | null>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validate = useCallback((fieldName?: keyof T) => {
    const fieldsToValidate = fieldName ? [fieldName] : Object.keys(validationRules) as (keyof T)[];
    const newErrors = { ...errors };

    fieldsToValidate.forEach(field => {
      const rule = validationRules[field];
      if (rule) {
        newErrors[field] = rule(values[field]);
      }
    });

    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === null);
  }, [values, errors, validationRules]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string | null>);
    setTouched({} as Record<keyof T, boolean>);
  }, [initialValues]);

  const isValid = Object.values(errors).every(error => error === null);
  const hasErrors = Object.values(errors).some(error => error !== null);

  return {
    values,
    errors,
    touched,
    isValid,
    hasErrors,
    setValue,
    setFieldTouched,
    validate,
    reset,
  };
};

// Spectral data processing hook
export const useSpectralAnalysis = () => {
  const [processing, setProcessing] = useState(false);
  const { addNotification } = useNotificationStore();

  const findPeaks = useCallback((wavelengths: number[], intensities: number[], threshold: number = 0.1) => {
    setProcessing(true);
    
    try {
      const peaks: Array<{ wavelength: number; intensity: number; index: number }> = [];
      const maxIntensity = Math.max(...intensities);
      const minThreshold = maxIntensity * threshold;
      
      for (let i = 1; i < intensities.length - 1; i++) {
        if (
          intensities[i] > intensities[i - 1] &&
          intensities[i] > intensities[i + 1] &&
          intensities[i] > minThreshold
        ) {
          peaks.push({
            wavelength: wavelengths[i],
            intensity: intensities[i],
            index: i,
          });
        }
      }
      
      return peaks;
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to detect peaks',
      });
      return [];
    } finally {
      setProcessing(false);
    }
  }, [addNotification]);

  const baselineCorrection = useCallback((intensities: number[], polynomialOrder: number = 2) => {
    setProcessing(true);
    
    try {
      // Simple polynomial baseline correction
      // This is a simplified version - a real implementation would use more sophisticated algorithms
      const n = intensities.length;
      // const x = Array.from({ length: n }, (_, i) => i); // Unused variable
      
      // Find minimum points for baseline estimation
      const windowSize = Math.floor(n / 10);
      const minPoints: number[] = [];
      
      for (let i = 0; i < n; i += windowSize) {
        const window = intensities.slice(i, Math.min(i + windowSize, n));
        const minIndex = window.indexOf(Math.min(...window));
        minPoints.push(i + minIndex);
      }
      
      // Create baseline by linear interpolation between minimum points
      const baseline = new Array(n);
      for (let i = 0; i < n; i++) {
        // Find surrounding minimum points
        let leftPoint = 0;
        let rightPoint = n - 1;
        
        for (const point of minPoints) {
          if (point <= i) leftPoint = point;
          if (point >= i && rightPoint === n - 1) rightPoint = point;
        }
        
        if (leftPoint === rightPoint) {
          baseline[i] = intensities[leftPoint];
        } else {
          const ratio = (i - leftPoint) / (rightPoint - leftPoint);
          baseline[i] = intensities[leftPoint] + ratio * (intensities[rightPoint] - intensities[leftPoint]);
        }
      }
      
      // Subtract baseline
      const corrected = intensities.map((intensity, i) => intensity - baseline[i]);
      
      return { corrected, baseline };
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to perform baseline correction',
      });
      return { corrected: intensities, baseline: new Array(intensities.length).fill(0) };
    } finally {
      setProcessing(false);
    }
  }, [addNotification]);

  const smoothSpectrum = useCallback((intensities: number[], windowSize: number = 5) => {
    setProcessing(true);
    
    try {
      if (windowSize % 2 === 0) windowSize += 1; // Ensure odd window size
      const halfWindow = Math.floor(windowSize / 2);
      const smoothed: number[] = [];
      
      for (let i = 0; i < intensities.length; i++) {
        let sum = 0;
        let count = 0;
        
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(intensities.length - 1, i + halfWindow); j++) {
          sum += intensities[j];
          count++;
        }
        
        smoothed.push(sum / count);
      }
      
      return smoothed;
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to smooth spectrum',
      });
      return intensities;
    } finally {
      setProcessing(false);
    }
  }, [addNotification]);

  const normalizeSpectrum = useCallback((intensities: number[], method: 'minmax' | 'zscore' = 'minmax') => {
    setProcessing(true);
    
    try {
      if (method === 'minmax') {
        const min = Math.min(...intensities);
        const max = Math.max(...intensities);
        const range = max - min;
        
        if (range === 0) return intensities;
        
        return intensities.map(value => (value - min) / range);
      } else if (method === 'zscore') {
        const mean = intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
        const std = Math.sqrt(
          intensities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intensities.length
        );
        
        if (std === 0) return intensities;
        
        return intensities.map(value => (value - mean) / std);
      }
      
      return intensities;
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to normalize spectrum',
      });
      return intensities;
    } finally {
      setProcessing(false);
    }
  }, [addNotification]);

  return {
    processing,
    findPeaks,
    baselineCorrection,
    smoothSpectrum,
    normalizeSpectrum,
  };
};

const hooks = {
  useAsync,
  useFileUpload,
  useLocalStorage,
  useDebounce,
  usePrevious,
  useWindowSize,
  useClickOutside,
  useFormValidation,
  useSpectralAnalysis,
};

export default hooks;