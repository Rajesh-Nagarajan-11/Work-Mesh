import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, CheckCircle, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SKILL_OPTIONS } from '../constants/skills';
import { projectRequestService } from '../services/projectRequestService';

export const ClientProjectRequest: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [clientEmail, setClientEmail] = useState('');

    const [form, setForm] = useState({
        name: '',
        clientName: '',
        domain: '',
        description: '',
        deadline: '',
    });
    const [skills, setSkills] = useState<Array<{ skillName: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('Invalid link');
            return;
        }
        projectRequestService
            .getForm(token)
            .then((data) => {
                setClientEmail(data.clientEmail);
                setForm((prev) => ({ ...prev, clientName: data.clientName || '' }));
                setStatus('form');
            })
            .catch((err) => {
                setStatus('error');
                setErrorMsg(err.response?.data?.message || err.message || 'Invalid or expired link');
            });
    }, [token]);

    const addSkill = () => {
        setSkills((p) => [...p, { skillName: '' }]);
    };

    const removeSkill = (i: number) => {
        setSkills((p) => p.filter((_, idx) => idx !== i));
    };

    const updateSkillName = (i: number, value: string) => {
        setSkills((p) => p.map((s, idx) => (idx === i ? { ...s, skillName: value } : s)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.deadline || !token) return;
        setIsSubmitting(true);
        try {
            await projectRequestService.submitForm(token, {
                name: form.name.trim(),
                clientName: form.clientName.trim() || undefined,
                domain: form.domain.trim() || undefined,
                description: form.description.trim() || undefined,
                deadline: form.deadline,
                requiredSkills: skills
                    .filter((s) => s.skillName.trim())
                    .map((s) => ({
                        skillName: s.skillName.trim(),
                        minimumExperience: 0,
                        priority: 'Must-have',
                        weight: 50,
                    })),
            });
            setStatus('success');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || err.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-slate-900">
                <p className="text-secondary-600 dark:text-secondary-400">Loading...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-slate-900 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-8 max-w-md text-center">
                    <p className="text-error-600 dark:text-error-400 font-medium">{errorMsg}</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-2">This link may have expired or already been used.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-slate-900 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-8 max-w-md text-center">
                    <div className="w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-success-600" />
                    </div>
                    <h1 className="text-xl font-bold text-secondary-900 dark:text-white mb-2">Thank you!</h1>
                    <p className="text-secondary-600 dark:text-secondary-400">
                        Your project requirements have been submitted successfully. The team will review and get back to you.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-50 dark:bg-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="bg-primary-600 px-6 py-5">
                        <h1 className="text-xl font-bold text-white">Project Requirements</h1>
                        <p className="text-primary-100 text-sm mt-2">
                            Provide title, deadline, and preferred tech. Your request will be saved as a draft for the team to complete.
                        </p>
                        {clientEmail && <p className="text-primary-200 text-xs mt-2">Invited as: {clientEmail}</p>}
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        <div className="space-y-5">
                            <Input
                                label="Project Title *"
                                placeholder="e.g., CRM Revamp"
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                required
                                className="min-h-[2.5rem]"
                            />
                            <Input
                                label="Client Name"
                                placeholder="e.g., Acme Corp"
                                value={form.clientName}
                                onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                                className="min-h-[2.5rem]"
                            />
                            <Input
                                label="Domain"
                                placeholder="e.g., Healthcare, Fintech"
                                value={form.domain}
                                onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
                                className="min-h-[2.5rem]"
                            />
                            <Input
                                label="Deadline *"
                                type="date"
                                leftIcon={<Calendar className="w-5 h-5" />}
                                value={form.deadline}
                                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                                required
                                className="min-h-[2.5rem]"
                            />
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Description (optional)</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="What is this project about?"
                                    rows={3}
                                    className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-secondary-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-secondary-900 dark:text-white">Preferred tech / skills</p>
                                    <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                                        List technologies or skills you need (e.g. React, Python, AWS). HR/Managers will add details later.
                                    </p>
                                </div>
                                <Button type="button" variant="secondary" size="sm" onClick={addSkill} leftIcon={<Plus className="w-4 h-4" />}>
                                    Add
                                </Button>
                            </div>
                            {skills.length === 0 ? (
                                <div className="text-sm text-secondary-500 dark:text-secondary-400 py-5 text-center border border-dashed border-border dark:border-slate-700 rounded-md">
                                    No skills added yet. Click &quot;Add&quot; to list preferred tech.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {skills.map((s, index) => {
                                        const skillOptions = s.skillName && !SKILL_OPTIONS.includes(s.skillName)
                                            ? [s.skillName, ...SKILL_OPTIONS]
                                            : SKILL_OPTIONS;
                                        return (
                                            <div
                                                key={index}
                                                className="flex gap-3 items-center p-4 border border-border dark:border-slate-700 rounded-md bg-surface dark:bg-slate-800"
                                            >
                                                <select
                                                    value={s.skillName}
                                                    onChange={(e) => updateSkillName(index, e.target.value)}
                                                    className="flex-1 min-h-[2.5rem] px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                >
                                                    <option value="">Select preferred tech / skill</option>
                                                    {skillOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(index)}
                                                    className="text-error hover:text-error-700 transition-colors p-2 rounded-md hover:bg-error-50 dark:hover:bg-error-900/20 min-h-[2.5rem] flex items-center justify-center shrink-0"
                                                    aria-label="Remove skill"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {errorMsg && <p className="text-sm text-error-600">{errorMsg}</p>}

                        <Button type="submit" disabled={!form.name.trim() || !form.deadline || isSubmitting} isLoading={isSubmitting} className="w-full">
                            Submit (saved as draft for team)
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
