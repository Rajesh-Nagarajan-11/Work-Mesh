/**
 * Public API for client form - no auth required
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const publicApi = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

export const projectRequestService = {
    async getForm(token: string): Promise<{ token: string; clientEmail: string; clientName: string }> {
        const response = await publicApi.get(`/project-requests/form/${token}`);
        return response.data.data;
    },

    async submitForm(
        token: string,
        data: {
            name: string;
            clientName?: string;
            domain?: string;
            description?: string;
            deadline: string;
            duration?: number;
            priority?: string;
            teamSize?: number;
            requiredSkills?: Array<{ skillName: string; minimumExperience?: number; priority?: string; weight?: number }>;
        }
    ): Promise<{ projectId: string }> {
        const response = await publicApi.post(`/project-requests/form/${token}/submit`, data);
        return response.data.data;
    },
};
