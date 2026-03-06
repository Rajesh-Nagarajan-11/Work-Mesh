import type { Allocation } from '../types';
import { api } from '../lib/axios';

export interface AllocationFormData {
    emp_id: string;
    project_id: string;
    allocation_start_date: string; // ISO date string
    allocation_end_date?: string | null;
    allocation_percentage: number;
}

export const allocationService = {
    /**
     * Get all allocations for the organization
     */
    async getAllocations(): Promise<Allocation[]> {
        const response = await api.get<Allocation[]>('/allocations');
        return response.data;
    },

    /**
     * Get allocations for a specific employee
     */
    async getByEmployee(empId: string): Promise<Allocation[]> {
        const response = await api.get<Allocation[]>(`/allocations/employee/${empId}`);
        return response.data;
    },

    /**
     * Get allocations for a specific project
     */
    async getByProject(projectId: string): Promise<Allocation[]> {
        const response = await api.get<Allocation[]>(`/allocations/project/${projectId}`);
        return response.data;
    },

    /**
     * Create a new allocation (assign employee to project)
     */
    async createAllocation(data: AllocationFormData): Promise<Allocation> {
        const response = await api.post<Allocation>('/allocations', data);
        return response.data;
    },

    /**
     * Update an allocation
     */
    async updateAllocation(id: string, data: Partial<AllocationFormData>): Promise<Allocation> {
        const response = await api.put<Allocation>(`/allocations/${id}`, data);
        return response.data;
    },

    /**
     * Delete an allocation
     */
    async deleteAllocation(id: string): Promise<void> {
        await api.delete(`/allocations/${id}`);
    },
};
