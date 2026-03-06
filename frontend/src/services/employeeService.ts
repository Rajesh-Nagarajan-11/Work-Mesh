import type { Employee, EmployeeFormData } from '../types';
import { api } from '../lib/axios';

export const employeeService = {
    /**
     * Get all employees in the organization
     */
    async getEmployees(): Promise<Employee[]> {
        const response = await api.get<Employee[]>('/employees');
        return response.data;
    },

    /**
     * Get single employee by ID
     */
    async getEmployee(id: string): Promise<Employee> {
        const response = await api.get<Employee>(`/employees/${id}`);
        return response.data;
    },

    /**
     * Create a new employee
     */
    async createEmployee(data: EmployeeFormData & { password?: string }): Promise<Employee> {
        const response = await api.post<Employee>('/employees', data);
        return response.data;
    },

    /**
     * Update an employee
     */
    async updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<Employee> {
        const response = await api.put<Employee>(`/employees/${id}`, data);
        return response.data;
    },

    /**
     * Delete an employee
     */
    async deleteEmployee(id: string): Promise<void> {
        await api.delete(`/employees/${id}`);
    },

    /**
     * Get an employee's project history
     */
    async getEmployeeHistory(id: string): Promise<any[]> {
        const response = await api.get(`/employees/${id}/history`);
        return response.data;
    },
};
