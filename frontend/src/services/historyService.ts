import type { ProjectHistory } from '../types';
import { api } from '../lib/axios';

export interface HistoryFormData {
    emp_id: string;
    project_id: string;
    role_in_project: string;
    allocation_percentage: number;
    performance_feedback?: number | null;
    domain_experience_year?: number;
}

export const historyService = {
    /**
     * Get all employee project history records in the org
     */
    async getAll(): Promise<ProjectHistory[]> {
        const response = await api.get<ProjectHistory[]>('/history');
        return response.data;
    },

    /**
     * Get history for a specific employee
     */
    async getByEmployee(empId: string): Promise<ProjectHistory[]> {
        const response = await api.get<ProjectHistory[]>(`/history/employee/${empId}`);
        return response.data;
    },

    /**
     * Get history for a specific project
     */
    async getByProject(projectId: string): Promise<ProjectHistory[]> {
        const response = await api.get<ProjectHistory[]>(`/history/project/${projectId}`);
        return response.data;
    },

    /**
     * Create a new history record
     */
    async create(data: HistoryFormData): Promise<ProjectHistory> {
        const response = await api.post<ProjectHistory>('/history', data);
        return response.data;
    },

    /**
     * Update an existing history record (e.g. add performance feedback)
     */
    async update(id: string, data: Partial<HistoryFormData>): Promise<ProjectHistory> {
        const response = await api.put<ProjectHistory>(`/history/${id}`, data);
        return response.data;
    },

    /**
     * Delete a history record
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/history/${id}`);
    },
};
