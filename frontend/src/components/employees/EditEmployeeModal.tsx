import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Briefcase, Building2, Mail, Phone, Plus, X } from 'lucide-react';
import type { Employee, EmployeeFormData, Skill } from '../../types';
import { useToast } from '../ui/Toast';
import { skillService } from '../../services/skillService';

interface EditEmployeeModalProps {
    isOpen: boolean;
    employee: Employee | null;
    onClose: () => void;
    onSave: (updated: Employee) => void;
}

type SkillInput = {
    id: string;
    skillId: string;
    skillName: string;
    yearsOfExperience: number;
    proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
};

const computeAvailabilityStatus = (currentProject?: string, currentWorkload?: number) => {
    const w = typeof currentWorkload === 'number' ? currentWorkload : 0;
    if (w >= 100) return 'Unavailable' as const;
    if (currentProject) return 'Partially Available' as const;
    return 'Available' as const;
};

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
    isOpen,
    employee,
    onClose,
    onSave,
}) => {
    const { addToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
        role: '',
        location: '',
        totalExperienceYears: '',
        communicationScore: '',
        teamworkScore: '',
        performanceRating: '',
        errorRate: '',
        pastProjectScore: '',
    });

    const [availability, setAvailability] = useState<{
        currentProject?: string;
        currentWorkload: number;
        availableFrom?: string;
    }>({ currentProject: undefined, currentWorkload: 0, availableFrom: undefined });

    const [skills, setSkills] = useState<SkillInput[]>([]);
    const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
    const [isLoadingSkills, setIsLoadingSkills] = useState(false);

    useEffect(() => {
        if (!employee) return;
        setErrors({});
        setFormData({
            name: employee.name || '',
            email: employee.email || '',
            phone: employee.phone || '',
            department: employee.department || '',
            role: employee.role || '',
            location: employee.location || '',
            totalExperienceYears:
                employee.total_experience_years !== undefined
                    ? String(employee.total_experience_years)
                    : employee.experience !== undefined
                    ? String(employee.experience)
                    : '',
            communicationScore:
                employee.communication_score !== undefined ? String(employee.communication_score) : '',
            teamworkScore: employee.teamwork_score !== undefined ? String(employee.teamwork_score) : '',
            performanceRating:
                employee.performance_rating !== undefined ? String(employee.performance_rating) : '',
            errorRate: employee.error_rate !== undefined ? String(employee.error_rate) : '',
            pastProjectScore:
                employee.pastProjectScore !== undefined ? String(employee.pastProjectScore) : '',
        });
        setAvailability({
            currentProject: employee.availability?.currentProject,
            currentWorkload: employee.availability?.currentWorkload || 0,
            availableFrom: employee.availability?.availableFrom,
        });
        setSkills(
            (employee.skills || []).map((s) => ({
                id: s.id,
                skillId: s.skillId,
                skillName: s.skillName,
                yearsOfExperience: s.yearsOfExperience,
                proficiencyLevel: s.proficiencyLevel,
            }))
        );
    }, [employee, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        
        const fetchSkills = async () => {
            setIsLoadingSkills(true);
            try {
                const skills = await skillService.getSkills();
                setAvailableSkills(skills);
            } catch (error) {
                console.error('Failed to fetch skills:', error);
                addToast('error', 'Failed to load skills');
            } finally {
                setIsLoadingSkills(false);
            }
        };

        fetchSkills();
    }, [isOpen, addToast]);

    const title = useMemo(() => (employee ? `Edit Employee — ${employee.name}` : 'Edit Employee'), [employee]);

    const handleChange = (field: string, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const addSkill = () => {
        setSkills((prev) => [
            ...prev,
            {
                id: `es-${Date.now()}`,
                skillId: `skill-${Date.now()}`,
                skillName: '',
                yearsOfExperience: 0,
                proficiencyLevel: 'Beginner',
            },
        ]);
    };

    const removeSkill = (index: number) => {
        setSkills((prev) => prev.filter((_, i) => i !== index));
    };

    const updateSkill = (index: number, field: keyof SkillInput, value: string | number) => {
        setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (!formData.name.trim()) next.name = 'Name is required';
        if (!formData.email.trim()) next.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = 'Invalid email format';
        if (!formData.department.trim()) next.department = 'Department is required';
        if (!formData.role.trim()) next.role = 'Role is required';
        if (formData.totalExperienceYears !== '' && Number(formData.totalExperienceYears) < 0)
            next.totalExperienceYears = 'Experience must be 0 or greater';
        if (
            formData.communicationScore !== '' &&
            (Number(formData.communicationScore) < 0 || Number(formData.communicationScore) > 10)
        )
            next.communicationScore = 'Communication score must be 0-10';
        if (
            formData.teamworkScore !== '' &&
            (Number(formData.teamworkScore) < 0 || Number(formData.teamworkScore) > 10)
        )
            next.teamworkScore = 'Teamwork score must be 0-10';
        if (
            formData.performanceRating !== '' &&
            (Number(formData.performanceRating) < 0 || Number(formData.performanceRating) > 10)
        )
            next.performanceRating = 'Performance rating must be 0-10';
        if (formData.errorRate !== '' && (Number(formData.errorRate) < 0 || Number(formData.errorRate) > 100))
            next.errorRate = 'Error rate must be 0-100';
        if (
            formData.pastProjectScore !== '' &&
            (Number(formData.pastProjectScore) < 0 || Number(formData.pastProjectScore) > 100)
        )
            next.pastProjectScore = 'Score must be 0–100';
        if (availability.currentWorkload < 0 || availability.currentWorkload > 100) next.currentWorkload = 'Workload must be 0–100';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        if (!validate()) {
            addToast('error', 'Please fix the errors');
            return;
        }

        setIsSubmitting(true);
        try {
            const status = computeAvailabilityStatus(availability.currentProject, availability.currentWorkload);

            const totalExp =
                formData.totalExperienceYears === '' ? undefined : Number(formData.totalExperienceYears);

            const employeeData: EmployeeFormData = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim() || undefined,
                department: formData.department.trim(),
                role: formData.role.trim(),
                location: formData.location.trim() || undefined,
                total_experience_years: totalExp,
                experience: totalExp,
                communication_score:
                    formData.communicationScore === '' ? undefined : Number(formData.communicationScore),
                teamwork_score:
                    formData.teamworkScore === '' ? undefined : Number(formData.teamworkScore),
                performance_rating:
                    formData.performanceRating === '' ? undefined : Number(formData.performanceRating),
                error_rate: formData.errorRate === '' ? undefined : Number(formData.errorRate),
                availability_status: status,
                skills: skills
                    .map((s) => ({ ...s, skillName: s.skillName.trim() }))
                    .filter((s) => s.skillName.length > 0)
                    .map((s) => ({
                        skillId: s.skillId,
                        yearsOfExperience: Number(s.yearsOfExperience) || 0,
                        proficiencyLevel: s.proficiencyLevel,
                    })),
                availability: {
                    status,
                    currentWorkload: Number(availability.currentWorkload) || 0,
                    currentProject: availability.currentProject?.trim() || undefined,
                    availableFrom: availability.availableFrom || undefined,
                },
                pastProjectScore:
                    formData.pastProjectScore === '' ? undefined : Number(formData.pastProjectScore),
            };

            const updated: Employee = {
                ...employee,
                id: employee.id, // Ensure the id is always present
                name: employeeData.name,
                email: employeeData.email,
                phone: employeeData.phone,
                department: employeeData.department,
                role: employeeData.role,
                location: employeeData.location,
                total_experience_years: employeeData.total_experience_years,
                communication_score: employeeData.communication_score,
                teamwork_score: employeeData.teamwork_score,
                performance_rating: employeeData.performance_rating,
                error_rate: employeeData.error_rate,
                experience: employeeData.experience,
                availability_status: employeeData.availability_status,
                pastProjectScore: employeeData.pastProjectScore,
                skills: skills
                    .map((s) => ({ ...s, skillName: s.skillName.trim() }))
                    .filter((s) => s.skillName.length > 0)
                    .map((s) => ({
                        id: s.id,
                        skillId: s.skillId,
                        skillName: s.skillName,
                        yearsOfExperience: Number(s.yearsOfExperience) || 0,
                        proficiencyLevel: s.proficiencyLevel,
                    })),
                availability: {
                    status,
                    currentProject: employeeData.availability.currentProject,
                    currentWorkload: employeeData.availability.currentWorkload,
                    availableFrom: employeeData.availability.availableFrom,
                },
                updatedAt: new Date().toISOString(),
            };

            onSave(updated);
            addToast('success', 'Employee updated');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={!employee}>
                Save
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg" footer={footer}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Full Name *"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={errors.name}
                        />
                        <Input
                            label="Email *"
                            type="email"
                            leftIcon={<Mail className="w-5 h-5" />}
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            error={errors.email}
                        />
                        <Input
                            label="Phone"
                            type="tel"
                            leftIcon={<Phone className="w-5 h-5" />}
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                        />
                        <Input
                            label="Total Experience (Years)"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.totalExperienceYears}
                            onChange={(e) =>
                                handleChange(
                                    'totalExperienceYears',
                                    e.target.value === '' ? '' : e.target.value
                                )
                            }
                            error={errors.totalExperienceYears}
                        />
                        <Input
                            label="Past Project Score (0-100)"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={formData.pastProjectScore}
                            onChange={(e) =>
                                handleChange(
                                    'pastProjectScore',
                                    e.target.value === '' ? '' : e.target.value
                                )
                            }
                            error={errors.pastProjectScore}
                        />
                        <Input
                            label="Location"
                            placeholder="City, Country"
                            value={formData.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Performance & Quality</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Communication Score (0-10)"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.communicationScore}
                            onChange={(e) =>
                                handleChange(
                                    'communicationScore',
                                    e.target.value === '' ? '' : e.target.value
                                )
                            }
                            error={errors.communicationScore}
                        />
                        <Input
                            label="Teamwork Score (0-10)"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.teamworkScore}
                            onChange={(e) =>
                                handleChange(
                                    'teamworkScore',
                                    e.target.value === '' ? '' : e.target.value
                                )
                            }
                            error={errors.teamworkScore}
                        />
                        <Input
                            label="Performance Rating (0-10)"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.performanceRating}
                            onChange={(e) =>
                                handleChange(
                                    'performanceRating',
                                    e.target.value === '' ? '' : e.target.value
                                )
                            }
                            error={errors.performanceRating}
                        />
                        <Input
                            label="Error Rate (%)"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={formData.errorRate}
                            onChange={(e) =>
                                handleChange('errorRate', e.target.value === '' ? '' : e.target.value)
                            }
                            error={errors.errorRate}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Department & Role</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Department *"
                            leftIcon={<Building2 className="w-5 h-5" />}
                            value={formData.department}
                            onChange={(e) => handleChange('department', e.target.value)}
                            error={errors.department}
                        />
                        <Input
                            label="Role *"
                            leftIcon={<Briefcase className="w-5 h-5" />}
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value)}
                            error={errors.role}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Availability</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Current Project (leave blank if available)"
                            placeholder="e.g., Project Alpha"
                            value={availability.currentProject || ''}
                            onChange={(e) =>
                                setAvailability((prev) => ({
                                    ...prev,
                                    currentProject: e.target.value || undefined,
                                }))
                            }
                        />
                        <Input
                            label="Current Workload (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={availability.currentWorkload}
                            onChange={(e) =>
                                setAvailability((prev) => ({
                                    ...prev,
                                    currentWorkload: parseInt(e.target.value) || 0,
                                }))
                            }
                            error={errors.currentWorkload}
                        />
                        <Input
                            label="Available From"
                            type="date"
                            value={availability.availableFrom || ''}
                            onChange={(e) =>
                                setAvailability((prev) => ({
                                    ...prev,
                                    availableFrom: e.target.value || undefined,
                                }))
                            }
                        />
                        <Input
                            label="Computed Availability Status"
                            value={computeAvailabilityStatus(
                                availability.currentProject,
                                availability.currentWorkload
                            )}
                            disabled
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Skills</h3>
                        <Button type="button" variant="secondary" size="sm" onClick={addSkill} leftIcon={<Plus className="w-4 h-4" />}>
                            Add Skill
                        </Button>
                    </div>

                    {skills.length === 0 ? (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400 py-4 text-center border border-dashed border-border rounded-md">
                            No skills added yet.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {skills.map((skill, index) => (
                                <div
                                    key={skill.id}
                                    className="grid grid-cols-12 gap-3 p-4 border border-border dark:border-slate-700 rounded-md bg-surface dark:bg-slate-800"
                                >
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                                            Skill Name
                                        </label>
                                        <select
                                            value={skill.skillId}
                                            onChange={(e) => {
                                                const selectedSkill = availableSkills.find(s => s.id === e.target.value);
                                                if (selectedSkill) {
                                                    updateSkill(index, 'skillId', selectedSkill.id);
                                                    updateSkill(index, 'skillName', selectedSkill.skill_name);
                                                }
                                            }}
                                            disabled={isLoadingSkills}
                                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                                        >
                                            <option value="">
                                                {isLoadingSkills ? 'Loading skills...' : 'Select a skill'}
                                            </option>
                                            {availableSkills.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.skill_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-6 md:col-span-3">
                                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                                            Years of Experience
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={skill.yearsOfExperience}
                                            onChange={(e) =>
                                                updateSkill(index, 'yearsOfExperience', parseFloat(e.target.value) || 0)
                                            }
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-4">
                                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                                            Proficiency Level
                                        </label>
                                        <select
                                            value={skill.proficiencyLevel}
                                            onChange={(e) =>
                                                updateSkill(index, 'proficiencyLevel', e.target.value as any)
                                            }
                                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-1 flex items-end justify-center pb-2">
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(index)}
                                            className="text-error hover:text-error-700 transition-colors p-2 rounded-md hover:bg-error-50 dark:hover:bg-error-900/20"
                                            aria-label="Remove skill"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};

