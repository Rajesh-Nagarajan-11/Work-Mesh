import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Mail, Phone, Briefcase, Building2, Plus, X } from 'lucide-react';
import type { Employee, EmployeeFormData, Skill } from '../../types';
import { employeeService } from '../../services/employeeService';
import { skillService } from '../../services/skillService';
import { useToast } from '../ui/Toast';

interface AddEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (employee?: Employee) => void;
}

interface SkillInput {
    skillId: string;
    skillName: string;
    yearsOfExperience: number;
    proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { addToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
        role: '',
        location: '',
        totalExperienceYears: '', // allow empty string for controlled input
        communicationScore: '',
        teamworkScore: '',
        performanceRating: '',
        errorRate: '',
        pastProjectScore: '', // allow empty string for controlled input
    });

    const [availability, setAvailability] = useState<{
        status: 'Available' | 'Partially Available' | 'Unavailable';
        currentProject?: string;
        currentWorkload: number;
        availableFrom?: string;
    }>({
        status: 'Available',
        currentProject: undefined,
        currentWorkload: 0,
        availableFrom: undefined,
    });

    const [skills, setSkills] = useState<SkillInput[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
    const [isLoadingSkills, setIsLoadingSkills] = useState(false);

    // Handle input changes
    const handleChange = (field: string, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Add new skill
    const addSkill = () => {
        setSkills((prev) => [
            ...prev,
            {
                skillId: `skill-${Date.now()}`,
                skillName: '',
                yearsOfExperience: 0,
                proficiencyLevel: 'Beginner',
            },
        ]);
    };

    // Remove skill
    const removeSkill = (index: number) => {
        setSkills((prev) => prev.filter((_, i) => i !== index));
    };

    // Update skill
    const updateSkill = (index: number, field: keyof SkillInput, value: string | number) => {
        setSkills((prev) =>
            prev.map((skill, i) =>
                i === index ? { ...skill, [field]: value } : skill
            )
        );
    };

    // Validate form
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.department.trim()) newErrors.department = 'Department is required';
        if (!formData.role.trim()) newErrors.role = 'Role is required';
        if (formData.totalExperienceYears !== '' && Number(formData.totalExperienceYears) < 0) newErrors.totalExperienceYears = 'Experience must be 0 or greater';
        if (formData.communicationScore !== '' && (Number(formData.communicationScore) < 0 || Number(formData.communicationScore) > 10)) newErrors.communicationScore = 'Communication score must be 0-10';
        if (formData.teamworkScore !== '' && (Number(formData.teamworkScore) < 0 || Number(formData.teamworkScore) > 10)) newErrors.teamworkScore = 'Teamwork score must be 0-10';
        if (formData.performanceRating !== '' && (Number(formData.performanceRating) < 0 || Number(formData.performanceRating) > 10)) newErrors.performanceRating = 'Performance rating must be 0-10';
        if (formData.errorRate !== '' && (Number(formData.errorRate) < 0 || Number(formData.errorRate) > 100)) newErrors.errorRate = 'Error rate must be 0-100';
        if (availability.currentWorkload < 0 || availability.currentWorkload > 100) newErrors.currentWorkload = 'Workload must be 0-100';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

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

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            addToast('error', 'Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const computedStatus: EmployeeFormData['availability']['status'] =
                availability.currentWorkload >= 100
                    ? 'Unavailable'
                    : availability.currentProject
                        ? 'Partially Available'
                        : 'Available';

            // Send to backend with full skill data
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || undefined,
                department: formData.department,
                role: formData.role,
                location: formData.location || undefined,
                experience: formData.totalExperienceYears === '' ? undefined : Number(formData.totalExperienceYears),
                total_experience_years: formData.totalExperienceYears === '' ? undefined : Number(formData.totalExperienceYears),
                communication_score: formData.communicationScore === '' ? undefined : Number(formData.communicationScore),
                teamwork_score: formData.teamworkScore === '' ? undefined : Number(formData.teamworkScore),
                performance_rating: formData.performanceRating === '' ? undefined : Number(formData.performanceRating),
                error_rate: formData.errorRate === '' ? undefined : Number(formData.errorRate),
                availability_status: computedStatus,
                pastProjectScore: formData.pastProjectScore === '' ? undefined : Number(formData.pastProjectScore),
                skills: skills
                    .filter((s) => s.skillName.trim())
                    .map((s) => ({
                        skillId: s.skillId,
                        skillName: s.skillName.trim(),
                        yearsOfExperience: s.yearsOfExperience,
                        proficiencyLevel: s.proficiencyLevel,
                    })),
                availability: {
                    status: computedStatus,
                    currentProject: availability.currentProject || undefined,
                    currentWorkload: availability.currentWorkload,
                    availableFrom: availability.availableFrom || undefined,
                },
            };

            const created = await employeeService.createEmployee(payload);
            addToast('success', 'Employee added successfully!');
            handleClose();
            onSuccess?.(created);
        } catch (error: any) {
            addToast(
                'error',
                error.response?.data?.message || 'Failed to add employee'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle close
    const handleClose = () => {
        setFormData({
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
        setAvailability({ status: 'Available', currentProject: undefined, currentWorkload: 0, availableFrom: undefined });
        setSkills([]);
        setErrors({});
        onClose();
    };

    const modalFooter = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
                Add Employee
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Employee"
            size="lg"
            footer={modalFooter}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Full Name *"
                            placeholder="Enter full name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={errors.name}
                        />
                        <Input
                            label="Email *"
                            type="email"
                            placeholder="employee@example.com"
                            leftIcon={<Mail className="w-5 h-5" />}
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            error={errors.email}
                        />
                        <Input
                            label="Phone"
                            type="tel"
                            placeholder="+91 9876543210"
                            leftIcon={<Phone className="w-5 h-5" />}
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                        />
                        <Input
                            label="Total Experience (Years)"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.totalExperienceYears === '' ? '' : String(formData.totalExperienceYears)}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleChange('totalExperienceYears', val === '' ? '' : parseFloat(val));
                            }}
                            error={errors.totalExperienceYears}
                        />
                        <Input
                            label="Past Project Score (0-100)"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={formData.pastProjectScore === '' ? '' : String(formData.pastProjectScore)}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleChange('pastProjectScore', val === '' ? '' : parseInt(val));
                            }}
                        />
                        <Input
                            label="Location"
                            placeholder="City, Country"
                            value={formData.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                        />
                    </div>
                </div>

                {/* Performance & Quality */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        Performance & Quality
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Communication Score (0-10)"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.communicationScore === '' ? '' : String(formData.communicationScore)}
                            onChange={(e) => handleChange('communicationScore', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            error={errors.communicationScore}
                        />
                        <Input
                            label="Teamwork Score (0-10)"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.teamworkScore === '' ? '' : String(formData.teamworkScore)}
                            onChange={(e) => handleChange('teamworkScore', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            error={errors.teamworkScore}
                        />
                        <Input
                            label="Performance Rating (0-10)"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.performanceRating === '' ? '' : String(formData.performanceRating)}
                            onChange={(e) => handleChange('performanceRating', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            error={errors.performanceRating}
                        />
                        <Input
                            label="Error Rate (%)"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={formData.errorRate === '' ? '' : String(formData.errorRate)}
                            onChange={(e) => handleChange('errorRate', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            error={errors.errorRate}
                        />
                    </div>
                </div>

                {/* Department & Role */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        Department & Role
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Department *"
                            placeholder="e.g., Engineering, HR"
                            leftIcon={<Building2 className="w-5 h-5" />}
                            value={formData.department}
                            onChange={(e) => handleChange('department', e.target.value)}
                            error={errors.department}
                        />
                        <Input
                            label="Role *"
                            placeholder="e.g., Senior Developer"
                            leftIcon={<Briefcase className="w-5 h-5" />}
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value)}
                            error={errors.role}
                        />
                    </div>
                </div>

                {/* Availability */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        Availability
                    </h3>
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
                            placeholder="0"
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
                            value={
                                availability.currentWorkload >= 100
                                    ? 'Unavailable'
                                    : availability.currentProject
                                        ? 'Partially Available'
                                        : 'Available'
                            }
                            disabled
                        />
                    </div>
                </div>

                {/* Skills */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                            Skills
                        </h3>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addSkill}
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Add Skill
                        </Button>
                    </div>

                    {skills.length === 0 ? (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400 py-4 text-center border border-dashed border-border rounded-md">
                            No skills added yet. Click "Add Skill" to get started.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {skills.map((skill, index) => (
                                <div
                                    key={index}
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
                                            placeholder="0"
                                            value={skill.yearsOfExperience}
                                            onChange={(e) =>
                                                updateSkill(
                                                    index,
                                                    'yearsOfExperience',
                                                    parseInt(e.target.value) || 0
                                                )
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
                                                updateSkill(index, 'proficiencyLevel', e.target.value)
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
