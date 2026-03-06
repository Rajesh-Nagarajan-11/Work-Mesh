import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Briefcase, Calendar, Star, TrendingUp } from 'lucide-react';
import type { Employee, EmployeeProjectHistory } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

// In a real app we'd fetch this from the backend. Since the ML endpoint returns this but 
// the Node backend doesn't have a direct endpoint yet, we'll simulate fetching history for now
// or rely on a new service method `employeeService.getEmployeeHistory(id)`.
import { employeeService } from '../../services/employeeService';

interface EmployeeHistoryModalProps {
    isOpen: boolean;
    employee: Employee | null;
    onClose: () => void;
}

export const EmployeeHistoryModal: React.FC<EmployeeHistoryModalProps> = ({
    isOpen,
    employee,
    onClose,
}) => {
    const [history, setHistory] = useState<EmployeeProjectHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !employee) return;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Currently attempting to load from Node backend if endpoint exists
                const data = await employeeService.getEmployeeHistory(employee.id);
                setHistory(data);
            } catch (error) {
                console.error("Failed to load history:", error);
                // Fallback to empty if endpoint not implemented
                setHistory([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, employee]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={employee ? `${employee.name}'s Project History` : 'Project History'}
            size="lg"
            footer={
                <div className="flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            }
        >
            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : history.length === 0 ? (
                <div className="py-8">
                    <EmptyState
                        icon={<Briefcase className="w-12 h-12" />}
                        title="No Project History"
                        description={`${employee?.name || 'This employee'} has not been assigned to any past projects.`}
                    />
                </div>
            ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {history.map((record) => (
                        <div key={record.id} className="p-4 border border-border dark:border-slate-700 rounded-lg bg-surface dark:bg-slate-800">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="text-md font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-primary" />
                                        {/* Fallback to ID if project name isn't populated via join */}
                                        {(record.project_id as any)?.name || `Project ${record.project_id.toString().substring(0, 8)}...`}
                                    </h4>
                                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                                        Role: <span className="font-medium text-secondary-800 dark:text-secondary-200">{record.role_in_project || 'Developer'}</span>
                                        <span className="ml-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-slate-700 dark:text-secondary-300">
                                            Allocation: {record.allocation_percentage}%
                                        </span>
                                    </p>

                                    {/* Display Contributed Skills (Project's Required Skills) */}
                                    {(record.project_id as any)?.requiredSkills?.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {(record.project_id as any).requiredSkills.map((skill: any) => (
                                                <span
                                                    key={skill.skillId || skill.id || skill._id || Math.random()}
                                                    className="px-2 py-0.5 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded text-[10px] font-semibold border border-primary-200 dark:border-primary-800/30"
                                                >
                                                    {skill.skillName}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {record.performance_feedback && (
                                    <div className="flex items-center gap-1 bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400 px-2.5 py-1 rounded-full text-xs font-bold border border-success-200 dark:border-success-800/30">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        {record.performance_feedback}/10
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-400 mt-3 pt-3 border-t border-border dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span>Added for Year {record.domain_experience_year}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Created {formatDate(record.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};
