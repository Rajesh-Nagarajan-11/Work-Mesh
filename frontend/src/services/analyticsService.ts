import type { KPI, ChartData } from '../types';
import { api } from '../lib/axios';

export interface UpcomingDeadline {
    id: string;
    projectName: string;
    dueDate: string;
    daysRemaining: number;
    status: 'critical' | 'warning' | 'upcoming';
}

export interface AnalyticsData {
    kpis: KPI[];
    projectsOverTime: ChartData[];
    skillDemand: ChartData[];
    upcomingDeadlines: UpcomingDeadline[];
    summary: {
        totalEmployees: number;
        activeProjects: number;
        completedProjects: number;
        activeAllocations: number;
        avgPerformance: number;
        utilization: number;
    };
}

export const analyticsService = {
    async getAnalytics(startDate?: string, endDate?: string): Promise<AnalyticsData> {
        const params = new URLSearchParams({
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        });
        const response = await api.get<AnalyticsData>(`/analytics?${params}`);
        return response.data;
    },

    async exportReport(format: 'pdf' | 'excel', startDate?: string, endDate?: string): Promise<Blob> {
        const params = new URLSearchParams({
            format,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        });
        const response = await api.get(`/reports/export?${params}`, {
            responseType: 'blob',
        });
        return response.data as unknown as Blob;
    },
};

