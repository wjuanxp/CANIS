// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isValidSpectralFile = (filename: string): boolean => {
  const validExtensions = ['csv', 'txt', 'dx', 'jdx', 'json'];
  const extension = getFileExtension(filename).toLowerCase();
  return validExtensions.includes(extension);
};

// Date utilities
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions);
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return formatDate(dateString);
};

// Array utilities
export const findPeaks = (data: number[], threshold: number = 0.1): number[] => {
  const peaks: number[] = [];
  const maxValue = Math.max(...data);
  const minThreshold = maxValue * threshold;
  
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > minThreshold) {
      peaks.push(i);
    }
  }
  
  return peaks;
};

export const smoothData = (data: number[], windowSize: number = 5): number[] => {
  if (windowSize % 2 === 0) windowSize += 1; // Ensure odd window size
  const halfWindow = Math.floor(windowSize / 2);
  const smoothed: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
      sum += data[j];
      count++;
    }
    
    smoothed.push(sum / count);
  }
  
  return smoothed;
};

export const normalizeData = (data: number[]): number[] => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  if (range === 0) return data;
  
  return data.map(value => (value - min) / range);
};

// Color utilities
export const getColorForTechnique = (technique: string): string => {
  const colors: Record<string, string> = {
    'UV-Vis': '#1f77b4',
    'IR': '#ff7f0e',
    'Raman': '#2ca02c',
    'LIBS': '#d62728',
    'XRF': '#9467bd',
    'XRD': '#8c564b',
  };
  
  return colors[technique] || '#17becf';
};

export const generateColorPalette = (count: number): string[] => {
  const colors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  
  return colors;
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Download utilities
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadJSON = (data: any, filename: string): void => {
  const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadFile(jsonBlob, filename);
};

export const downloadCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
  ].join('\n');
  
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  downloadFile(csvBlob, filename);
};

// Error utilities
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  return 'An unexpected error occurred';
};

// Local storage utilities
export const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Spectral data utilities
export const parseJCAMPDX = (content: string): { wavelengths: number[]; intensities: number[] } | null => {
  try {
    const lines = content.split('\n');
    let wavelengths: number[] = [];
    let intensities: number[] = [];
    let inDataSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('##XYDATA=')) {
        inDataSection = true;
        continue;
      }
      
      if (trimmedLine.startsWith('##END=')) {
        break;
      }
      
      if (inDataSection && trimmedLine && !trimmedLine.startsWith('##')) {
        const parts = trimmedLine.split(/\s+/);
        if (parts.length >= 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          if (!isNaN(x) && !isNaN(y)) {
            wavelengths.push(x);
            intensities.push(y);
          }
        }
      }
    }
    
    return wavelengths.length > 0 ? { wavelengths, intensities } : null;
  } catch (error) {
    console.error('Failed to parse JCAMP-DX:', error);
    return null;
  }
};

export const parseCSV = (content: string): { wavelengths: number[]; intensities: number[] } | null => {
  try {
    const lines = content.split('\n');
    const wavelengths: number[] = [];
    const intensities: number[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      const parts = trimmedLine.split(',');
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          wavelengths.push(x);
          intensities.push(y);
        }
      }
    }
    
    return wavelengths.length > 0 ? { wavelengths, intensities } : null;
  } catch (error) {
    console.error('Failed to parse CSV:', error);
    return null;
  }
};