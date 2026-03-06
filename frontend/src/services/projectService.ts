import type { Project, ProjectFormData } from '../types';
import { api } from '../lib/axios';

export const projectService = {
    async getProjects(): Promise<Project[]> {
        const response = await api.get<Project[]>('/projects');
        return response.data;
    },

    async getProject(id: string): Promise<Project> {
        const response = await api.get<Project>(`/projects/${id}`);
        return response.data;
    },

    async createProject(data: ProjectFormData & { deadline: string }): Promise<Project> {
        const response = await api.post<Project>('/projects', data);
        return response.data;
    },

    async updateProject(id: string, data: Partial<ProjectFormData>): Promise<Project> {
        const response = await api.put<Project>(`/projects/${id}`, data);
        return response.data;
    },

    async deleteProject(id: string): Promise<void> {
        await api.delete(`/projects/${id}`);
    },

    async sendFormToClient(clientEmail: string, clientName?: string): Promise<{ formUrl: string; previewUrl?: string; token?: string; clientEmail?: string }> {
        const response = await api.post<{ token: string; formUrl: string; clientEmail: string; previewUrl?: string }>('/project-requests/send', {
            clientEmail,
            clientName: clientName || '',
        });
        return response.data;
    },

    async recommendTeam(projectId: string, excludeUnavailable = false): Promise<import('../types').TeamRecommendation> {
        const response = await api.get<import('../types').TeamRecommendation>(
            `/projects/${projectId}/recommend-team`,
            { params: { exclude_unavailable: excludeUnavailable } }
        );
        return response.data;
    },
};
