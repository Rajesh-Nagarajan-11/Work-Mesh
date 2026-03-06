import React, { useState, useEffect } from 'react';
import { Users, Briefcase, CheckCircle, TrendingUp } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { StatsCard } from '../components/dashboard/StatsCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines';
import { analyticsService } from '../services/analyticsService';
import type { KPI, ChartData } from '../types';
import type { UpcomingDeadline } from '../services/analyticsService';

export const Dashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [projectsOverTime, setProjectsOverTime] = useState<ChartData[]>([]);
    const [skillDemand, setSkillDemand] = useState<ChartData[]>([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);

    useEffect(() => {
        analyticsService
            .getAnalytics()
            .then((data) => {
                setKpis(data.kpis);
                setProjectsOverTime(data.projectsOverTime);
                setSkillDemand(data.skillDemand);
                setUpcomingDeadlines(data.upcomingDeadlines ?? []);
            })
            .catch((err) => {
                console.error('Failed to fetch analytics:', err);
                setError('Could not load dashboard data. Please try again.');
                // Fall back to empty state so the layout still renders
                setKpis([]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const iconMap = {
        Users,
        Briefcase,
        CheckCircle,
        TrendingUp,
    };

    const colorMap = {
        Users: 'bg-primary-100 text-primary-600',
        Briefcase: 'bg-warning-100 text-warning-600',
        CheckCircle: 'bg-success-100 text-success-600',
        TrendingUp: 'bg-secondary-100 text-secondary-600',
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <LoadingSpinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-secondary-600 dark:text-secondary-400">
                        Welcome back! Here's your team formation overview.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpis.map((kpi) => (
                        <StatsCard
                            key={kpi.label}
                            icon={iconMap[kpi.icon as keyof typeof iconMap]}
                            label={kpi.label}
                            value={kpi.value}
                            change={kpi.change}
                            trend={kpi.trend}
                            format={kpi.label === 'Team Utilization' ? 'percentage' : 'number'}
                            iconClassName={colorMap[kpi.icon as keyof typeof colorMap]}
                        />
                    ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                            Projects Over Time
                        </h3>
                        <div className="h-64">
                            <LineChart data={projectsOverTime} height={240} />
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                            Skill Demand
                        </h3>
                        <div className="h-64">
                            <BarChart data={skillDemand} height={240} />
                        </div>
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        Upcoming Deadlines
                    </h3>
                    {upcomingDeadlines.length === 0 ? (
                        <p className="text-secondary-500 dark:text-secondary-400 text-sm">
                            No upcoming deadlines in the next 30 days.
                        </p>
                    ) : (
                        <UpcomingDeadlines deadlines={upcomingDeadlines} />
                    )}
                </div>
            </div>
        </MainLayout>
    );
};
