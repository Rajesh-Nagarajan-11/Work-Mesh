import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { analyticsService } from '../services/analyticsService';
import type { AnalyticsData } from '../services/analyticsService';
import { Users, Briefcase, CheckCircle, TrendingUp, Download, Clock, Star } from 'lucide-react';

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    sub?: string;
    color: string;
}> = ({ icon, label, value, sub, color }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-border dark:border-slate-700 p-5 flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>{icon}</div>
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400">{label}</p>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

export const Reports: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await analyticsService.getAnalytics();
            setData(result);
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError('Could not load analytics data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <LoadingSpinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    if (error || !data) {
        return (
            <MainLayout>
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">Reports &amp; Analytics</h1>
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-red-700 dark:text-red-400">
                        {error || 'No data available.'}
                    </div>
                </div>
            </MainLayout>
        );
    }

    const { summary, projectsOverTime, skillDemand, upcomingDeadlines } = data;

    return (
        <MainLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">Reports &amp; Analytics</h1>
                        <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                            Real-time workforce and project insights
                        </p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Users className="w-5 h-5 text-primary-600" />}
                        label="Total Employees"
                        value={summary.totalEmployees}
                        sub={`${summary.utilization}% utilization`}
                        color="bg-primary-100 dark:bg-primary-900/30"
                    />
                    <StatCard
                        icon={<Briefcase className="w-5 h-5 text-warning-600" />}
                        label="Active Projects"
                        value={summary.activeProjects}
                        sub={`${summary.completedProjects} completed`}
                        color="bg-warning-100 dark:bg-warning-900/30"
                    />
                    <StatCard
                        icon={<CheckCircle className="w-5 h-5 text-success-600" />}
                        label="Active Allocations"
                        value={summary.activeAllocations}
                        sub="current assignments"
                        color="bg-success-100 dark:bg-success-900/30"
                    />
                    <StatCard
                        icon={<Star className="w-5 h-5 text-secondary-600" />}
                        label="Avg Performance"
                        value={summary.avgPerformance > 0 ? `${summary.avgPerformance}/10` : '—'}
                        sub="from project feedback"
                        color="bg-secondary-100 dark:bg-secondary-900/30"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
                            Projects Created — Last 6 Months
                        </h3>
                        <div className="h-56">
                            <LineChart data={projectsOverTime} height={210} />
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
                            Top Skills in Demand
                        </h3>
                        {skillDemand.length === 0 ? (
                            <p className="text-secondary-400 text-sm mt-4">
                                No skill data yet. Add employee skills via the Employees page.
                            </p>
                        ) : (
                            <div className="h-56">
                                <BarChart data={skillDemand} height={210} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Utilization Bar */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary-600" />
                            Team Utilization
                        </h3>
                        <span className="text-2xl font-bold text-primary-600">{summary.utilization}%</span>
                    </div>
                    <div className="w-full h-4 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${summary.utilization >= 90
                                ? 'bg-error-500'
                                : summary.utilization >= 70
                                    ? 'bg-warning-500'
                                    : 'bg-primary'
                                }`}
                            style={{ width: `${summary.utilization}%` }}
                        />
                    </div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-2">
                        {summary.totalEmployees - Math.round((summary.utilization * summary.totalEmployees) / 100)} employees available of {summary.totalEmployees} total
                    </p>
                </div>

                {/* Upcoming Deadlines Table */}
                <div className="card p-6">
                    <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning-600" />
                        Upcoming Project Deadlines (Next 30 Days)
                    </h3>
                    {upcomingDeadlines.length === 0 ? (
                        <p className="text-secondary-400 text-sm">No active projects due in the next 30 days.</p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-surface dark:bg-slate-900 text-left">
                                        <th className="px-4 py-3 font-semibold text-secondary-600 dark:text-secondary-300 text-xs uppercase">Project</th>
                                        <th className="px-4 py-3 font-semibold text-secondary-600 dark:text-secondary-300 text-xs uppercase">Due Date</th>
                                        <th className="px-4 py-3 font-semibold text-secondary-600 dark:text-secondary-300 text-xs uppercase">Days Left</th>
                                        <th className="px-4 py-3 font-semibold text-secondary-600 dark:text-secondary-300 text-xs uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    {upcomingDeadlines.map((d) => (
                                        <tr key={d.id} className="hover:bg-secondary-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-secondary-900 dark:text-white">{d.projectName}</td>
                                            <td className="px-4 py-3 text-secondary-600 dark:text-secondary-400">{d.dueDate}</td>
                                            <td className="px-4 py-3 font-semibold">
                                                <span className={
                                                    d.daysRemaining <= 2
                                                        ? 'text-error-600 dark:text-error-400'
                                                        : d.daysRemaining <= 7
                                                            ? 'text-warning-600 dark:text-warning-400'
                                                            : 'text-success-600 dark:text-success-400'
                                                }>
                                                    {d.daysRemaining}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'critical'
                                                    ? 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-300'
                                                    : d.status === 'warning'
                                                        ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-300'
                                                        : 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-300'
                                                    }`}>
                                                    {d.status === 'critical' ? '🔴 Critical' : d.status === 'warning' ? '🟡 Warning' : '🟢 Upcoming'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card p-5 text-center">
                        <p className="text-3xl font-bold text-primary-600">{summary.completedProjects}</p>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Completed Projects</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className="text-3xl font-bold text-success-600">{summary.activeAllocations}</p>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Active Allocations</p>
                    </div>
                    <div className="card p-5 text-center col-span-2 lg:col-span-1">
                        <p className="text-3xl font-bold text-warning-600">
                            {summary.avgPerformance > 0 ? summary.avgPerformance : '—'}
                        </p>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Avg Feedback Score</p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};
