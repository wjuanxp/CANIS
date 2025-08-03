import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  User,
  UserCreate,
  Project,
  ProjectCreate,
  Sample,
  SampleCreate,
  Spectrum,
  SpectrumCreate,
  Analysis,
  AnalysisCreate,
  LoginCredentials,
  AuthToken,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    this.api = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.request({
        method,
        url,
        data,
      });
      
      if (response.data.success) {
        return response.data.data as T;
      } else {
        throw new Error('API request failed');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw error;
    }
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    try {
      const response = await this.api.post<AuthToken>('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const token = response.data.access_token;
      localStorage.setItem('access_token', token);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('access_token');
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get<User>('/users/me');
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('GET', '/users/');
  }

  async createUser(userData: UserCreate): Promise<User> {
    return this.request<User>('POST', '/users/', userData);
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    return this.request<User>('PUT', `/users/${userId}`, userData);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request<void>('DELETE', `/users/${userId}`);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('GET', '/projects/');
  }

  async getProject(projectId: number): Promise<Project> {
    return this.request<Project>('GET', `/projects/${projectId}`);
  }

  async createProject(projectData: ProjectCreate): Promise<Project> {
    return this.request<Project>('POST', '/projects/', projectData);
  }

  async updateProject(projectId: number, projectData: Partial<Project>): Promise<Project> {
    return this.request<Project>('PUT', `/projects/${projectId}`, projectData);
  }

  async deleteProject(projectId: number): Promise<void> {
    return this.request<void>('DELETE', `/projects/${projectId}`);
  }

  // Samples
  async getSamples(projectId?: string): Promise<Sample[]> {
    const url = projectId ? `/samples/?project_id=${projectId}` : '/samples/';
    return this.request<Sample[]>('GET', url);
  }

  async getSample(sampleId: number): Promise<Sample> {
    return this.request<Sample>('GET', `/samples/${sampleId}`);
  }

  async createSample(sampleData: SampleCreate): Promise<Sample> {
    return this.request<Sample>('POST', '/samples/', sampleData);
  }

  async updateSample(sampleId: number, sampleData: Partial<Sample>): Promise<Sample> {
    return this.request<Sample>('PUT', `/samples/${sampleId}`, sampleData);
  }

  async deleteSample(sampleId: number): Promise<void> {
    return this.request<void>('DELETE', `/samples/${sampleId}`);
  }

  // Spectra
  async getSpectra(sampleId?: string): Promise<Spectrum[]> {
    const url = sampleId ? `/spectra/?sample_id=${sampleId}` : '/spectra/';
    return this.request<Spectrum[]>('GET', url);
  }

  async getSpectrum(spectrumId: number): Promise<Spectrum> {
    return this.request<Spectrum>('GET', `/spectra/${spectrumId}`);
  }

  async createSpectrum(spectrumData: SpectrumCreate): Promise<Spectrum> {
    return this.request<Spectrum>('POST', '/spectra/', spectrumData);
  }

  async uploadSpectrum(file: File, sampleId: number): Promise<Spectrum> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sample_id', sampleId.toString());

    const response = await this.api.post<ApiResponse<Spectrum>>('/spectra/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.success) {
      return response.data.data as Spectrum;
    } else {
      throw new Error('Upload failed');
    }
  }

  async deleteSpectrum(spectrumId: number): Promise<void> {
    return this.request<void>('DELETE', `/spectra/${spectrumId}`);
  }

  // Analysis
  async getAnalyses(spectrumId?: string): Promise<Analysis[]> {
    const url = spectrumId ? `/analysis/?spectrum_id=${spectrumId}` : '/analysis/';
    return this.request<Analysis[]>('GET', url);
  }

  async getAnalysis(analysisId: string): Promise<Analysis> {
    return this.request<Analysis>('GET', `/analysis/${analysisId}`);
  }

  async createAnalysis(analysisData: AnalysisCreate): Promise<Analysis> {
    return this.request<Analysis>('POST', '/analysis/', analysisData);
  }

  async deleteAnalysis(analysisId: string): Promise<void> {
    return this.request<void>('DELETE', `/analysis/${analysisId}`);
  }

  // Analysis methods
  async getAnalysisMethods(): Promise<string[]> {
    return this.request<string[]>('GET', '/analysis/methods');
  }

  async runBaselineCorrection(spectrumId: string, parameters: any): Promise<Analysis> {
    return this.request<Analysis>('POST', `/analysis/baseline-correction`, {
      spectrum_id: spectrumId,
      parameters,
    });
  }

  async runPeakDetection(spectrumId: string, parameters: any): Promise<Analysis> {
    return this.request<Analysis>('POST', `/analysis/peak-detection`, {
      spectrum_id: spectrumId,
      parameters,
    });
  }

  // Export functions
  async exportSpectrum(spectrumId: string, format: 'csv' | 'jcamp' | 'json'): Promise<Blob> {
    const response = await this.api.get(`/spectra/${spectrumId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  async exportAnalysis(analysisId: string, format: 'csv' | 'json' | 'pdf'): Promise<Blob> {
    const response = await this.api.get(`/analysis/${analysisId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;