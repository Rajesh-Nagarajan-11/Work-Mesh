import type { Skill } from '../types';
import { api } from '../lib/axios';

export interface SkillFormData {
    skill_name: string;
    skill_category: string;
}

export const skillService = {
    /**
     * Get all skills in the organization
     */
    async getSkills(): Promise<Skill[]> {
        const response = await api.get<Skill[]>('/skills');
        return response.data;
    },

    /**
     * Get a single skill by ID
     */
    async getSkill(id: string): Promise<Skill> {
        const response = await api.get<Skill>(`/skills/${id}`);
        return response.data;
    },

    /**
     * Create a new skill in the master catalog
     */
    async createSkill(data: SkillFormData): Promise<Skill> {
        const response = await api.post<Skill>('/skills', data);
        return response.data;
    },

    /**
     * Update a skill
     */
    async updateSkill(id: string, data: Partial<SkillFormData>): Promise<Skill> {
        const response = await api.put<Skill>(`/skills/${id}`, data);
        return response.data;
    },

    /**
     * Delete a skill
     */
    async deleteSkill(id: string): Promise<void> {
        await api.delete(`/skills/${id}`);
    },

    /**
     * Get all skills assigned to an employee
     */
    async getEmployeeSkills(empId: string): Promise<import('../types').EmployeeSkill[]> {
        const response = await api.get<import('../types').EmployeeSkill[]>(`/employees/${empId}/skills`);
        return response.data;
    },

    /**
     * Add or update a skill for an employee
     */
    async upsertEmployeeSkill(
        empId: string,
        data: { skill_id: string; proficiency_level: number; years_experience: number; last_used_year?: number }
    ): Promise<import('../types').EmployeeSkill> {
        const response = await api.post<import('../types').EmployeeSkill>(`/employees/${empId}/skills`, data);
        return response.data;
    },

    /**
     * Remove a skill from an employee
     */
    async removeEmployeeSkill(empId: string, skillId: string): Promise<void> {
        await api.delete(`/employees/${empId}/skills/${skillId}`);
    },
};
