// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  created_at: string;
  last_login?: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'analyst' | 'viewer';
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

// Sample Types
export interface Sample {
  id: string;
  project_id: string;
  sample_id: string; // user-defined ID
  name: string;
  description?: string;
  sample_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SampleCreate {
  project_id: string;
  sample_id: string;
  name: string;
  description?: string;
  sample_type?: string;
  metadata?: Record<string, any>;
}

// Spectrum Types
export type SpectroscopicTechnique = 'UV-Vis' | 'IR' | 'Raman' | 'LIBS' | 'XRF' | 'XRD' | 'Near-IR' | 'Unknown';

export interface Spectrum {
  id: number;
  sample_id: number;
  technique: string;
  filename: string;
  wavelengths: number[];
  intensities: number[];
  acquisition_parameters?: Record<string, any>;
  created_at: string;
  file_hash?: string;
}

export interface SpectrumCreate {
  sample_id: string;
  technique: SpectroscopicTechnique;
  filename: string;
  wavelengths: number[];
  intensities: number[];
  acquisition_parameters?: Record<string, any>;
}

// Analysis Types
export interface Analysis {
  id: string;
  spectrum_id: string;
  method_name: string;
  parameters: Record<string, any>;
  results: Record<string, any>;
  created_by: string;
  created_at: string;
}

export interface AnalysisCreate {
  spectrum_id: string;
  method_name: string;
  parameters: Record<string, any>;
}

// Chart/Plot Types
export interface PlotData {
  x: number[];
  y: number[];
  type: string;
  name?: string;
  line?: {
    color?: string;
    width?: number;
  };
}

export interface PlotLayout {
  title?: string;
  xaxis?: {
    title?: string;
    range?: [number, number];
  };
  yaxis?: {
    title?: string;
    range?: [number, number];
  };
  showlegend?: boolean;
  [key: string]: any;
}

// Authentication Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// File Upload Types
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadedFile {
  filename: string;
  size: number;
  type: string;
  content?: string | ArrayBuffer;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  spectrum_id?: number;
  filename: string;
  technique: string;
  data_points: number;
}

// Analysis Method Types
export interface AnalysisMethod {
  name: string;
  description: string;
  parameters: AnalysisParameter[];
  techniques: SpectroscopicTechnique[];
}

export interface AnalysisParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  description: string;
  default?: any;
  options?: string[]; // for select type
  min?: number; // for number type
  max?: number; // for number type
  required?: boolean;
}

// Navigation/UI Types
export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
}

export interface TableColumn {
  field: string;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (params: any) => React.ReactNode;
}

// State Management Types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentProject: Project | null;
  projects: Project[];
  samples: Sample[];
  spectra: Spectrum[];
  analyses: Analysis[];
  loading: boolean;
  error: string | null;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  duration?: number;
}