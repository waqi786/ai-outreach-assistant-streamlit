import { create } from 'zustand';
import { api, getApiError } from './api';
import type { Project } from '@/types';

interface ProjectsStore {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<Project[]>;
  createProject: (payload: { name: string; systemPrompt: string }) => Promise<Project>;
  replaceProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  async fetchProjects() {
    set({ loading: true, error: null });

    try {
      const { data } = await api.get<Project[]>('/projects');
      set({ projects: data, loading: false });
      return data;
    } catch (error) {
      const message = getApiError(error);
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
  async createProject(payload) {
    const { data } = await api.post<Project>('/projects', payload);
    set({ projects: [data, ...get().projects] });
    return data;
  },
  replaceProject(project) {
    set({
      projects: get().projects.map((item) => (item.id === project.id ? project : item)),
    });
  },
  removeProject(projectId) {
    set({
      projects: get().projects.filter((item) => item.id !== projectId),
    });
  },
}));
