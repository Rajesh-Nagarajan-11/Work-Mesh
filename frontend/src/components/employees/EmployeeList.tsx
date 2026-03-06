import React from 'react';
import { Employee } from '../../types';
import { Mail, Phone, Briefcase, Edit, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmployeeListProps {
    employees: Employee[];
    onEdit?: (employee: Employee) => void;
    onDelete?: (employee: Employee) => void;
    onHistory?: (employee: Employee) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
    employees,
    onEdit,
    onDelete,
    onHistory,
}) => {
    const getAvailabilityColor = (currentProject?: string) => {
        if (!currentProject) {
            return 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400';
        }
        return 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400';
    };

    const getProficiencyColor = (level: string) => {
        switch (level) {
            case 'Expert':
                return 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400';
            case 'Advanced':
                return 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400';
            case 'Intermediate':
                return 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400';
            case 'Beginner':
                return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400';
            default:
                return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400';
        }
    };

    return (
        <div className="space-y-4">
            {employees.map((employee) => (
                <div
                    key={employee.id}
                    className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Left Section - Employee Info */}
                        <div className="flex-1 space-y-3">
                            {/* Name and Role */}
                            <div>
                                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
                                    {employee.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Briefcase className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
                                    <p className="text-secondary-600 dark:text-secondary-400">
                                        {employee.role} • {employee.department}
                                    </p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400">
                                    <Mail className="w-4 h-4" />
                                    {employee.email}
                                </div>
                                {employee.phone && (
                                    <div className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400">
                                        <Phone className="w-4 h-4" />
                                        {employee.phone}
                                    </div>
                                )}
                            </div>

                            {/* Experience and Score */}
                            <div className="flex flex-wrap gap-3 text-sm">
                                <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400 font-medium">
                                    {employee.experience || employee.total_experience_years || 0} years exp.
                                </span>
                                {employee.pastProjectScore && (
                                    <span className="px-3 py-1 rounded-full bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400 font-medium flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        Score: {employee.pastProjectScore}/100
                                    </span>
                                )}
                                <span
                                    className={`px-3 py-1 rounded-full font-medium ${getAvailabilityColor(employee.availability?.currentProject)}`}
                                >
                                    {employee.availability?.currentProject ? `On: ${employee.availability.currentProject}` : (employee.availability_status || employee.availability?.status || 'Available')}
                                </span>
                                {employee.availability?.currentWorkload && employee.availability.currentWorkload > 0 ? (
                                    <span className="px-3 py-1 rounded-full bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400 font-medium">
                                        {employee.availability.currentWorkload}% workload
                                    </span>
                                ) : null}
                            </div>

                            {/* Skills */}
                            {employee.skills && employee.skills.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2">
                                        SKILLS
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {employee.skills.map((skill) => (
                                            <div
                                                key={skill.id}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium ${getProficiencyColor(skill.proficiencyLevel)}`}
                                            >
                                                {skill.skillName} • {skill.yearsOfExperience}y •{' '}
                                                {skill.proficiencyLevel}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Section - Actions */}
                        <div className="flex lg:flex-col gap-2">
                            {onHistory && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onHistory(employee)}
                                    leftIcon={<Briefcase className="w-4 h-4" />}
                                >
                                    History
                                </Button>
                            )}
                            {onEdit && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onEdit(employee)}
                                    leftIcon={<Edit className="w-4 h-4" />}
                                >
                                    Edit
                                </Button>
                            )}
                            {onDelete && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => onDelete(employee)}
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
