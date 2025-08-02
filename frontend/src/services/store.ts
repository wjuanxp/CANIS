import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Project,
  Sample,
  Spectrum,
  Analysis,
  Notification,
} from '../types';
import { apiService } from './api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createProject: (projectData: any) => Promise<Project>;
  updateProject: (projectId: string, projectData: any) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}

interface SampleState {
  samples: Sample[];
  loading: boolean;
  error: string | null;
  loadSamples: (projectId?: string) => Promise<void>;
  createSample: (sampleData: any) => Promise<Sample>;
  updateSample: (sampleId: string, sampleData: any) => Promise<void>;
  deleteSample: (sampleId: string) => Promise<void>;
}

interface SpectrumState {
  spectra: Spectrum[];
  currentSpectrum: Spectrum | null;
  loading: boolean;
  error: string | null;
  loadSpectra: (sampleId?: string) => Promise<void>;
  setCurrentSpectrum: (spectrum: Spectrum | null) => void;
  uploadSpectrum: (file: File, sampleId: string) => Promise<Spectrum>;
  deleteSpectrum: (spectrumId: string) => Promise<void>;
}

interface AnalysisState {
  analyses: Analysis[];
  loading: boolean;
  error: string | null;
  loadAnalyses: (spectrumId?: string) => Promise<void>;
  createAnalysis: (analysisData: any) => Promise<Analysis>;
  deleteAnalysis: (analysisId: string) => Promise<void>;
  runBaselineCorrection: (spectrumId: string, parameters: any) => Promise<Analysis>;
  runPeakDetection: (spectrumId: string, parameters: any) => Promise<Analysis>;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface UIStateStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      login: async (username: string, password: string) => {
        try {
          await apiService.login({ username, password });
          const user = await apiService.getCurrentUser();
          set({ user, isAuthenticated: true });
        } catch (error: any) {
          throw new Error(error.message || 'Login failed');
        }
      },
      
      logout: () => {
        apiService.logout();
        set({ user: null, isAuthenticated: false });
      },
      
      loadUser: async () => {
        try {
          const token = localStorage.getItem('access_token');
          if (token) {
            const user = await apiService.getCurrentUser();
            set({ user, isAuthenticated: true });
          }
        } catch (error) {
          // Token invalid or expired
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Project Store
export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await apiService.getProjects();
      set({ projects, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },
  
  createProject: async (projectData: any) => {
    try {
      const project = await apiService.createProject(projectData);
      set(state => ({ projects: [...state.projects, project] }));
      return project;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateProject: async (projectId: string, projectData: any) => {
    try {
      const updatedProject = await apiService.updateProject(projectId, projectData);
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: state.currentProject?.id === projectId ? updatedProject : state.currentProject,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteProject: async (projectId: string) => {
    try {
      await apiService.deleteProject(projectId);
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));

// Sample Store
export const useSampleStore = create<SampleState>((set, get) => ({
  samples: [],
  loading: false,
  error: null,
  
  loadSamples: async (projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const samples = await apiService.getSamples(projectId);
      set({ samples, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  createSample: async (sampleData: any) => {
    try {
      const sample = await apiService.createSample(sampleData);
      set(state => ({ samples: [...state.samples, sample] }));
      return sample;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateSample: async (sampleId: string, sampleData: any) => {
    try {
      const updatedSample = await apiService.updateSample(sampleId, sampleData);
      set(state => ({
        samples: state.samples.map(s => s.id === sampleId ? updatedSample : s)
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteSample: async (sampleId: string) => {
    try {
      await apiService.deleteSample(sampleId);
      set(state => ({
        samples: state.samples.filter(s => s.id !== sampleId)
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));

// Spectrum Store
export const useSpectrumStore = create<SpectrumState>((set, get) => ({
  spectra: [],
  currentSpectrum: null,
  loading: false,
  error: null,
  
  loadSpectra: async (sampleId?: string) => {
    set({ loading: true, error: null });
    try {
      const spectra = await apiService.getSpectra(sampleId);
      set({ spectra, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  setCurrentSpectrum: (spectrum: Spectrum | null) => {
    set({ currentSpectrum: spectrum });
  },
  
  uploadSpectrum: async (file: File, sampleId: string) => {
    try {
      const spectrum = await apiService.uploadSpectrum(file, sampleId);
      set(state => ({ spectra: [...state.spectra, spectrum] }));
      return spectrum;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteSpectrum: async (spectrumId: string) => {
    try {
      await apiService.deleteSpectrum(spectrumId);
      set(state => ({
        spectra: state.spectra.filter(s => s.id !== spectrumId),
        currentSpectrum: state.currentSpectrum?.id === spectrumId ? null : state.currentSpectrum,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));

// Analysis Store
export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analyses: [],
  loading: false,
  error: null,
  
  loadAnalyses: async (spectrumId?: string) => {
    set({ loading: true, error: null });
    try {
      const analyses = await apiService.getAnalyses(spectrumId);
      set({ analyses, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  createAnalysis: async (analysisData: any) => {
    try {
      const analysis = await apiService.createAnalysis(analysisData);
      set(state => ({ analyses: [...state.analyses, analysis] }));
      return analysis;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteAnalysis: async (analysisId: string) => {
    try {
      await apiService.deleteAnalysis(analysisId);
      set(state => ({
        analyses: state.analyses.filter(a => a.id !== analysisId)
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  runBaselineCorrection: async (spectrumId: string, parameters: any) => {
    try {
      const analysis = await apiService.runBaselineCorrection(spectrumId, parameters);
      set(state => ({ analyses: [...state.analyses, analysis] }));
      return analysis;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  runPeakDetection: async (spectrumId: string, parameters: any) => {
    try {
      const analysis = await apiService.runPeakDetection(spectrumId, parameters);
      set(state => ({ analyses: [...state.analyses, analysis] }));
      return analysis;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));

// Notification Store
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    set(state => ({
      notifications: [...state.notifications, newNotification]
    }));
    
    // Auto-remove notification after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(newNotification.id);
      }, notification.duration || 5000);
    }
  },
  
  removeNotification: (id: string) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },
  
  clearNotifications: () => {
    set({ notifications: [] });
  },
}));

// UI Store
export const useUIStore = create<UIStateStore>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      theme: 'light',
      
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setTheme: (theme: 'light' | 'dark') => set({ theme }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      toggleTheme: () => set(state => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'ui-storage',
    }
  )
);