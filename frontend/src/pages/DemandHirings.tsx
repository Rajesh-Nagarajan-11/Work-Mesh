import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { AlertCircle, TrendingUp, Users, Activity } from 'lucide-react';

interface MissingSkill {
    skill_id: string;
    skill_name: string;
    demand_project_count: number;
    supply_employee_count: number;
    gap_score: number;
    affected_projects: string[];
}

interface ProjectAtRisk {
    project_name: string;
    critical_missing_skills: string[];
}

interface RecommendedHire {
    role_title: string;
    target_project: string;
    required_skills: string[];
    why: string;
}

interface DemandData {
    top_missing_skills: MissingSkill[];
    projects_at_risk: ProjectAtRisk[];
    recommended_hires: RecommendedHire[];
}

export const DemandHirings: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<DemandData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDemand = async () => {
            if (!user?.organizationId) return;
            try {
                // Fetch directly from the ML backend on port 8000
                const response = await fetch(`http://localhost:8000/demand/${user.organizationId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch demand data');
                }
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDemand();
    }, [user?.organizationId]);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    if (error || !data) {
        return (
            <MainLayout>
                <EmptyState
                    icon={<AlertCircle className="w-12 h-12 text-error-500" />}
                    title="Could not load hiring demand"
                    description={error || "An unknown error occurred."}
                />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">Demand & Hirings</h1>
                    <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                        Analytics on workforce skill gaps and projects at risk.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Top Stats */}
                    <div className="card p-6 flex flex-col items-center text-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
                        <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-2" />
                        <h3 className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                            {data.top_missing_skills.length}
                        </h3>
                        <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Critical Skill Gaps</p>
                    </div>

                    <div className="card p-6 flex flex-col items-center text-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
                        <Activity className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                        <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                            {data.projects_at_risk.length}
                        </h3>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Projects At Risk</p>
                    </div>

                    <div className="card p-6 flex flex-col items-center text-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
                        <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                        <h3 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                            {data.top_missing_skills.reduce((acc, skill) => acc + skill.demand_project_count, 0)}
                        </h3>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Skill Demands</p>
                    </div>
                </div>



                {/* Recommended Candidate Profiles */}
                <div className="card p-6">
                    <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-6 flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary-500" />
                        Recommended Hiring Profiles
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-6 font-medium">
                        Based on the current project skill gaps, here are the ideal candidate profiles the organization should prioritize hiring:
                    </p>
                    {data.recommended_hires.length === 0 ? (
                        <p className="text-sm text-secondary-500">No urgent hiring profiles found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.recommended_hires.map((hire, index) => (
                                <div key={index} className="flex flex-col p-5 rounded-2xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    {/* Accent banner */}
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-blue-500" />

                                    <div className="flex justify-between items-start mb-3 mt-1">
                                        <h4 className="text-lg font-bold text-secondary-900 dark:text-white leading-tight">
                                            {hire.role_title}
                                        </h4>
                                    </div>

                                    <div className="mb-4 text-xs font-semibold text-primary-600 dark:text-primary-400">
                                        Target: {hire.target_project}
                                    </div>

                                    <div className="flex-1">
                                        <div className="bg-secondary-50 dark:bg-slate-700/40 p-3 rounded-xl mb-4 text-sm text-secondary-700 dark:text-secondary-300 italic border border-secondary-100 dark:border-slate-700/50">
                                            "{hire.why}"
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-2">Required Core Skills:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {hire.required_skills.map(skill => (
                                                    <span key={skill} className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 rounded-lg shadow-sm">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};
