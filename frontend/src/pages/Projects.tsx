import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Briefcase,
    Calendar,
    Edit,
    Flag,
    LayoutGrid,
    List,
    Mail,
    Plus,
    Search,
    X,
    Users,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SKILL_OPTIONS } from '../constants/skills';
import type { Project } from '../types';
import { projectService } from '../services/projectService';

type ProjectStatus = Project['status'];
type ProjectPriority = Project['priority'];

type CreateSkillInput = {
    skillName: string;
    minimumExperience: number;
    priority: 'Must-have' | 'Nice-to-have';
    weight: number;
};

const STATUS_COLUMNS: ProjectStatus[] = ['Draft', 'Active', 'Completed', 'Archived'];

const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
};

const deadlineToInputValue = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getPriorityBadge = (priority: ProjectPriority) => {
    switch (priority) {
        case 'High':
            return 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-400';
        case 'Medium':
            return 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400';
        case 'Low':
        default:
            return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400';
    }
};

const getStatusHeader = (status: ProjectStatus) => {
    switch (status) {
        case 'Active':
            return 'text-primary-700 dark:text-primary-300';
        case 'Completed':
            return 'text-success-700 dark:text-success-300';
        case 'Archived':
            return 'text-secondary-600 dark:text-secondary-400';
        case 'Draft':
        default:
            return 'text-warning-700 dark:text-warning-300';
    }
};

export const Projects: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'board' | 'list'>('board');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | 'all'>('all');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        priority: '' as ProjectPriority | '',
        status: '' as ProjectStatus | '',
        deadline: '',
        duration: '' as number | '',
        teamSize: '' as number | '',
    });
    const [createSkills, setCreateSkills] = useState<CreateSkillInput[]>([]);

    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        priority: 'Medium' as ProjectPriority,
        status: 'Draft' as ProjectStatus,
        deadline: '',
        duration: 3,
        teamSize: 5,
        progress: 0,
    });
    const [editSkills, setEditSkills] = useState<CreateSkillInput[]>([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const [isSendFormOpen, setIsSendFormOpen] = useState(false);
    const [sendFormEmail, setSendFormEmail] = useState('');
    const [sendFormName, setSendFormName] = useState('');
    const [isSendingForm, setIsSendingForm] = useState(false);
    const [formUrl, setFormUrl] = useState<string | null>(null);

    // Fetch from real backend API
    const fetchProjects = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await projectService.getProjects();
            setProjects(data);
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            addToast('error', 'Failed to load projects');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        const editId = (location.state as { editProjectId?: string } | null)?.editProjectId;
        if (editId && projects.length > 0) {
            const p = projects.find((proj) => proj.id === editId);
            if (p && (p.status === 'Draft' || p.status === 'Active')) {
                openEdit(p);
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, projects]);

    const filteredProjects = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return projects.filter((p) => {
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.requiredSkills.some((s) => s.skillName.toLowerCase().includes(q));
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [projects, searchQuery, statusFilter, priorityFilter]);

    const stats = useMemo(() => {
        const active = projects.filter((p) => p.status === 'Active').length;
        const completed = projects.filter((p) => p.status === 'Completed').length;
        const highPriority = projects.filter((p) => p.priority === 'High' && p.status !== 'Completed').length;
        const avgProgress =
            projects.length === 0
                ? 0
                : Math.round(
                    projects.reduce((sum, p) => sum + (typeof p.progress === 'number' ? p.progress : 0), 0) /
                    projects.length
                );
        return { active, completed, highPriority, avgProgress };
    }, [projects]);

    const groupedByStatus = useMemo(() => {
        const groups: Record<ProjectStatus, Project[]> = {
            Draft: [],
            Active: [],
            Completed: [],
            Archived: [],
        };
        for (const p of filteredProjects) {
            groups[p.status].push(p);
        }
        return groups;
    }, [filteredProjects]);

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            description: '',
            priority: '',
            status: '',
            deadline: '',
            duration: '',
            teamSize: '',
        });
        setCreateSkills([]);
    };

    const addCreateSkill = () => {
        setCreateSkills((prev) => [
            ...prev,
            {
                skillName: '',
                minimumExperience: 1,
                priority: 'Must-have',
                weight: 50,
            },
        ]);
    };

    const removeCreateSkill = (index: number) => {
        setCreateSkills((prev) => prev.filter((_, i) => i !== index));
    };

    const updateCreateSkill = <K extends keyof CreateSkillInput>(
        index: number,
        key: K,
        value: CreateSkillInput[K]
    ) => {
        setCreateSkills((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
    };

    const canEditProject = (p: Project) => p.status === 'Draft' || p.status === 'Active';

    const openEdit = (p: Project) => {
        setEditingProject(p);
        setEditForm({
            name: p.name,
            description: p.description || '',
            priority: p.priority,
            status: p.status,
            deadline: deadlineToInputValue(p.deadline),
            duration: typeof p.duration === 'number' ? p.duration : 3,
            teamSize: p.teamPreferences?.teamSize ?? 5,
            progress: typeof p.progress === 'number' ? p.progress : 0,
        });
        setEditSkills(
            (p.requiredSkills || []).map((s) => ({
                skillName: s.skillName,
                minimumExperience: s.minimumExperience ?? 0,
                priority: s.priority || 'Must-have',
                weight: Math.min(10, Math.max(1, Math.round((s.weight ?? 50) / 10))),
            }))
        );
    };

    const closeEdit = () => {
        setEditingProject(null);
        setIsSavingEdit(false);
    };

    const addEditSkill = () => {
        setEditSkills((prev) => [
            ...prev,
            { skillName: '', minimumExperience: 0, priority: 'Must-have', weight: 5 },
        ]);
    };

    const removeEditSkill = (index: number) => {
        setEditSkills((prev) => prev.filter((_, i) => i !== index));
    };

    const updateEditSkill = <K extends keyof CreateSkillInput>(
        index: number,
        key: K,
        value: CreateSkillInput[K]
    ) => {
        setEditSkills((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
    };

    const handleUpdateProject = async () => {
        if (!editingProject) return;
        const name = editForm.name.trim();
        if (!name) return;

        const deadline =
            editForm.deadline && !Number.isNaN(new Date(editForm.deadline).getTime())
                ? new Date(editForm.deadline).toISOString()
                : editingProject.deadline;

        setIsSavingEdit(true);
        try {
            const updated = await projectService.updateProject(editingProject.id, {
                name,
                description: editForm.description.trim() || '—',
                duration: Math.max(1, Number(editForm.duration) || 1),
                priority: editForm.priority,
                deadline,
                status: editForm.status,
                progress: editForm.status === 'Completed' ? 100 : editForm.progress,
                requiredSkills: editSkills
                    .filter((s) => s.skillName.trim())
                    .map((s) => ({
                        skillId: `skill-${s.skillName.toLowerCase().replace(/\s+/g, '-')}`,
                        skillName: s.skillName.trim(),
                        minimumExperience: Math.max(0, Number(s.minimumExperience) || 0),
                        priority: s.priority,
                        weight: Math.min(10, Math.max(1, Number(s.weight) || 5)) * 10,
                    })),
                teamPreferences: {
                    teamSize: Math.max(1, Number(editForm.teamSize) || 1),
                    seniorityMix: editingProject.teamPreferences?.seniorityMix ?? { junior: 40, mid: 40, senior: 20 },
                },
            } as any);
            setProjects((prev) => prev.map((proj) => (proj.id === editingProject.id ? updated : proj)));
            addToast('success', 'Project updated');
            closeEdit();
        } catch (err) {
            addToast('error', 'Failed to update project');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleCreateProject = async () => {
        const name = createForm.name.trim();
        const description = createForm.description.trim();
        if (!name) return;

        const deadline =
            createForm.deadline && !Number.isNaN(new Date(createForm.deadline).getTime())
                ? new Date(createForm.deadline).toISOString()
                : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

        try {
            const created = await projectService.createProject({
                name,
                description: description || '—',
                duration: Math.max(1, Number(createForm.duration) || 1),
                priority: createForm.priority,
                deadline,
                status: createForm.status,
                progress: createForm.status === 'Completed' ? 100 : createForm.status === 'Active' ? 20 : 0,
                requiredSkills: createSkills
                    .filter((s) => s.skillName.trim())
                    .map((s) => ({
                        skillId: `skill-${s.skillName.toLowerCase().replace(/\s+/g, '-')}`,
                        skillName: s.skillName.trim(),
                        minimumExperience: Math.max(0, Number(s.minimumExperience) || 0),
                        priority: s.priority,
                        weight: Math.min(10, Math.max(1, Number(s.weight) || 5)) * 10,
                    })),
                teamPreferences: {
                    teamSize: Math.max(1, Number(createForm.teamSize) || 1),
                    seniorityMix: { junior: 40, mid: 40, senior: 20 },
                },
            } as any);
            setProjects((prev) => [created, ...prev]);
            addToast('success', 'Project created');
            setIsCreateOpen(false);
            resetCreateForm();
        } catch (err) {
            addToast('error', 'Failed to create project');
        }
    };

    const handleSendFormToClient = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendFormEmail.trim())) {
            addToast('error', 'Enter a valid client email');
            return;
        }
        setIsSendingForm(true);
        setFormUrl(null);
        try {
            const result = await projectService.sendFormToClient(sendFormEmail.trim(), sendFormName.trim() || undefined);
            console.log('Send form result:', result);
            if (result && result.formUrl) {
                setFormUrl(result.formUrl);
                try {
                    await navigator.clipboard.writeText(result.formUrl);
                    addToast('success', 'Form link copied to clipboard. Email sent to client.');
                } catch (clipErr) {
                    // Clipboard failed but form was sent
                    addToast('success', 'Email sent to client. Form link: ' + result.formUrl);
                }
            } else {
                throw new Error('No form URL in response');
            }
        } catch (err) {
            console.error('Send form error:', err);
            addToast('error', 'Failed to send form: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsSendingForm(false);
        }
    };

    const closeSendFormModal = () => {
        setIsSendFormOpen(false);
        setSendFormEmail('');
        setSendFormName('');
        setFormUrl(null);
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">Projects</h1>
                        <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                            Track delivery, priorities, and team requirements
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="inline-flex rounded-md border border-border dark:border-slate-700 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setView('board')}
                                className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${view === 'board'
                                    ? 'bg-primary text-white'
                                    : 'bg-white dark:bg-slate-800 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-slate-700'
                                    }`}
                                aria-pressed={view === 'board'}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Board
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className={`px-3 py-2 text-sm font-medium flex items-center gap-2 border-l border-border dark:border-slate-700 ${view === 'list'
                                    ? 'bg-primary text-white'
                                    : 'bg-white dark:bg-slate-800 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-slate-700'
                                    }`}
                                aria-pressed={view === 'list'}
                            >
                                <List className="w-4 h-4" />
                                List
                            </button>
                        </div>

                        <Button variant="secondary" onClick={() => setIsSendFormOpen(true)} leftIcon={<Mail className="w-5 h-5" />}>
                            Send form to client
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
                            Create Project
                        </Button>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-4">
                        <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400">ACTIVE</p>
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-2xl font-semibold text-secondary-900 dark:text-white">{stats.active}</p>
                            <Briefcase className="w-5 h-5 text-primary-600" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-4">
                        <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400">COMPLETED</p>
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-2xl font-semibold text-secondary-900 dark:text-white">{stats.completed}</p>
                            <Flag className="w-5 h-5 text-success-600" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-4">
                        <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400">HIGH PRIORITY</p>
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-2xl font-semibold text-secondary-900 dark:text-white">{stats.highPriority}</p>
                            <Flag className="w-5 h-5 text-error-600" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-4">
                        <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400">AVG PROGRESS</p>
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-2xl font-semibold text-secondary-900 dark:text-white">{stats.avgProgress}%</p>
                            <div className="w-12 h-2 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${stats.avgProgress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search projects, descriptions, or required skills..."
                                leftIcon={<Search className="w-5 h-5" />}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                showClearButton
                                onClear={() => setSearchQuery('')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 lg:w-[420px]">
                            <div>
                                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                    Status
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                                    className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value="all">All</option>
                                    {STATUS_COLUMNS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value as ProjectPriority | 'all')}
                                    className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value="all">All</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {filteredProjects.length === 0 ? (
                    <EmptyState
                        icon={<Briefcase className="w-16 h-16" />}
                        title="No matching projects"
                        description="Try adjusting your search or filters, or create a new project."
                        action={{
                            label: 'Create Project',
                            onClick: () => setIsCreateOpen(true),
                        }}
                    />
                ) : view === 'board' ? (
                    <div className="space-y-8">
                        {STATUS_COLUMNS.filter(s => groupedByStatus[s].length > 0).map((status) => (
                            <div key={status} className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border dark:border-slate-700 pb-2">
                                    <span className={`text-lg font-bold ${getStatusHeader(status)}`}>
                                        {status} Projects
                                    </span>
                                    <span className="text-sm px-2.5 py-0.5 rounded-full bg-secondary-100 dark:bg-slate-800 text-secondary-700 dark:text-secondary-300 font-medium">
                                        {groupedByStatus[status].length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {groupedByStatus[status].map((p) => (
                                        <div
                                            key={p.id}
                                            className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 p-4 hover:shadow-md transition-shadow flex flex-col h-full"
                                        >
                                            <div className="flex justify-between items-start gap-3 mb-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                                                        {p.name}
                                                    </p>
                                                    <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1 line-clamp-2">
                                                        {p.description}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(
                                                        p.priority
                                                    )} shrink-0`}
                                                >
                                                    {p.priority}
                                                </span>
                                            </div>

                                            <div className="space-y-3 flex-grow">
                                                <div className="flex items-center justify-between text-xs text-secondary-600 dark:text-secondary-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDate(p.deadline)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {p.teamPreferences.teamSize}
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between text-xs text-secondary-600 dark:text-secondary-400 mb-1">
                                                        <span>Progress</span>
                                                        <span>{typeof p.progress === 'number' ? p.progress : 0}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary"
                                                            style={{
                                                                width: `${typeof p.progress === 'number' ? p.progress : 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {p.requiredSkills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {p.requiredSkills.slice(0, 4).map((s) => (
                                                            <span
                                                                key={s.id || s.skillId || s.skillName}
                                                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
                                                            >
                                                                {s.skillName}
                                                            </span>
                                                        ))}
                                                        {p.requiredSkills.length > 4 && (
                                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-300">
                                                                +{p.requiredSkills.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-border dark:border-slate-700 flex items-center justify-end gap-2 flex-wrap">
                                                {canEditProject(p) && (
                                                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)} leftIcon={<Edit className="w-3.5 h-3.5" />}>
                                                        Edit
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="tertiary" onClick={() => navigate(`/projects/${p.id}`)}>
                                                    View
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${p.id}/teams`)}>
                                                    Teams
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 overflow-hidden">
                        <div className="divide-y divide-border dark:divide-slate-700">
                            {filteredProjects.map((p) => (
                                <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-secondary-900 dark:text-white truncate">{p.name}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(p.priority)}`}>
                                                {p.priority}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-300">
                                                {p.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1 line-clamp-2">
                                            {p.description}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary-600 dark:text-secondary-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(p.deadline)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                Team size: {p.teamPreferences.teamSize}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-3.5 h-3.5" />
                                                Duration: {p.duration} mo
                                            </span>
                                        </div>
                                    </div>
                                    <div className="sm:w-56">
                                        <div className="flex items-center justify-between text-xs text-secondary-600 dark:text-secondary-400 mb-1">
                                            <span>Progress</span>
                                            <span>{typeof p.progress === 'number' ? p.progress : 0}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${typeof p.progress === 'number' ? p.progress : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 sm:w-44 flex-wrap">
                                        {canEditProject(p) && (
                                            <Button size="sm" variant="secondary" onClick={() => openEdit(p)} leftIcon={<Edit className="w-3.5 h-3.5" />}>
                                                Edit
                                            </Button>
                                        )}
                                        <Button size="sm" variant="tertiary" onClick={() => navigate(`/projects/${p.id}`)}>
                                            View
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${p.id}/teams`)}>
                                            Teams
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Project Modal (local-only, demo) */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    resetCreateForm();
                }}
                title="Create Project"
                size="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsCreateOpen(false);
                                resetCreateForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateProject} disabled={!createForm.name.trim()}>
                            Create
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="Project Name *"
                            placeholder="e.g., CRM Revamp"
                            value={createForm.name}
                            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <Input
                            label="Deadline"
                            type="date"
                            leftIcon={<Calendar className="w-5 h-5" />}
                            value={createForm.deadline}
                            onChange={(e) => setCreateForm((p) => ({ ...p, deadline: e.target.value }))}
                        />
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                                Priority
                            </label>
                            <select
                                value={createForm.priority}
                                onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value as ProjectPriority }))}
                                className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                                <option value="">Select priority</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                                Status
                            </label>
                            <select
                                value={createForm.status}
                                onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                                className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                                <option value="">Select status</option>
                                {STATUS_COLUMNS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Duration (months)"
                            type="number"
                            min={1}
                            placeholder="e.g. 3"
                            leftIcon={<Briefcase className="w-5 h-5" />}
                            value={createForm.duration === '' ? '' : createForm.duration}
                            onChange={(e) => setCreateForm((p) => ({ ...p, duration: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) }))}
                        />
                        <Input
                            label="Preferred Team Size"
                            type="number"
                            min={1}
                            placeholder="e.g. 5"
                            leftIcon={<Users className="w-5 h-5" />}
                            value={createForm.teamSize === '' ? '' : createForm.teamSize}
                            onChange={(e) => setCreateForm((p) => ({ ...p, teamSize: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={createForm.description}
                            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                            placeholder="What is this project about?"
                            rows={4}
                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-secondary-500"
                        />
                    </div>

                    {/* Required Skills */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-3 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-secondary-900 dark:text-white">Required Skills</p>
                                <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                                    Add skills needed for the project (used for team generation later).
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={addCreateSkill}
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Add Skill
                            </Button>
                        </div>

                        {createSkills.length === 0 ? (
                            <div className="text-sm text-secondary-500 dark:text-secondary-400 py-4 text-center border border-dashed border-border dark:border-slate-700 rounded-md">
                                No skills added yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {createSkills.map((s, index) => {
                                    const skillOptions = s.skillName && !SKILL_OPTIONS.includes(s.skillName)
                                        ? [s.skillName, ...SKILL_OPTIONS]
                                        : SKILL_OPTIONS;
                                    return (
                                        <div
                                            key={index}
                                            className="flex flex-col gap-2 p-3 border border-border dark:border-slate-700 rounded-md bg-surface dark:bg-slate-800"
                                        >
                                            <div className="flex flex-col">
                                                <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                                    Skill / Tech
                                                </label>
                                                <select
                                                    className="w-full px-3 py-1.5 text-sm border border-border rounded transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                    value={s.skillName}
                                                    onChange={(e) => updateCreateSkill(index, 'skillName', e.target.value)}
                                                >
                                                    <option value="">Select skill or tech</option>
                                                    {skillOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                                        Min Exp (y)
                                                    </label>
                                                    <Input
                                                        className="px-3 py-1.5 text-sm"
                                                        type="number"
                                                        min={0}
                                                        placeholder="0"
                                                        value={s.minimumExperience === 0 ? '' : s.minimumExperience}
                                                        onChange={(e) =>
                                                            updateCreateSkill(index, 'minimumExperience', parseFloat(e.target.value) || 0)
                                                        }
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                                        Priority
                                                    </label>
                                                    <select
                                                        className="w-full px-3 py-1.5 text-sm border border-border rounded transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                        value={s.priority}
                                                        onChange={(e) =>
                                                            updateCreateSkill(index, 'priority', e.target.value as CreateSkillInput['priority'])
                                                        }
                                                    >
                                                        <option value="Must-have">Must-have</option>
                                                        <option value="Nice-to-have">Nice-to-have</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                                        Weight (1–10)
                                                    </label>
                                                    <Input
                                                        className="px-3 py-1.5 text-sm w-full"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        placeholder="5"
                                                        value={s.weight === 0 ? '' : s.weight}
                                                        onChange={(e) => updateCreateSkill(index, 'weight', Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 5)))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => removeCreateSkill(index)}
                                                    className="text-error hover:text-error-700 transition-colors px-2 py-1 rounded text-xs hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center gap-1"
                                                    aria-label="Remove skill"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Edit Project Modal */}
            <Modal
                isOpen={!!editingProject}
                onClose={closeEdit}
                title={editingProject ? `Edit Project — ${editingProject.name}` : 'Edit Project'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={closeEdit} disabled={isSavingEdit}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateProject} disabled={!editForm.name.trim() || isSavingEdit} isLoading={isSavingEdit}>
                            Save
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="Project Name *"
                            placeholder="e.g., CRM Revamp"
                            value={editForm.name}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                            label="Deadline"
                            type="date"
                            leftIcon={<Calendar className="w-5 h-5" />}
                            value={editForm.deadline}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, deadline: e.target.value }))}
                        />
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Priority</label>
                            <select
                                value={editForm.priority}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value as ProjectPriority }))}
                                className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Status</label>
                            <select
                                value={editForm.status}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))}
                                className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                                {STATUS_COLUMNS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {editForm.status === 'Active' && (
                            <div className="md:col-span-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                                        Project Progress
                                    </label>
                                    <span className="text-sm font-bold text-primary">{editForm.progress}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={editForm.progress}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, progress: parseInt(e.target.value, 10) || 0 }))}
                                    className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary"
                                />
                            </div>
                        )}
                        <Input
                            label="Duration (months)"
                            type="number"
                            min={1}
                            leftIcon={<Briefcase className="w-5 h-5" />}
                            value={editForm.duration}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                        />
                        <Input
                            label="Preferred Team Size"
                            type="number"
                            min={1}
                            leftIcon={<Users className="w-5 h-5" />}
                            value={editForm.teamSize}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, teamSize: parseInt(e.target.value) || 1 }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Description</label>
                        <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="What is this project about?"
                            rows={4}
                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-secondary-500"
                        />
                    </div>

                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-3 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-secondary-900 dark:text-white">Required Skills</p>
                                <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                                    Add skills needed for the project (used for team generation later).
                                </p>
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={addEditSkill} leftIcon={<Plus className="w-4 h-4" />}>
                                Add Skill
                            </Button>
                        </div>
                        {editSkills.length === 0 ? (
                            <div className="text-sm text-secondary-500 dark:text-secondary-400 py-5 text-center border border-dashed border-border dark:border-slate-700 rounded-md">
                                No skills added yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {editSkills.map((s, index) => {
                                    const skillOptions = s.skillName && !SKILL_OPTIONS.includes(s.skillName)
                                        ? [s.skillName, ...SKILL_OPTIONS]
                                        : SKILL_OPTIONS;
                                    return (
                                        <div
                                            key={index}
                                            className="flex flex-col gap-2 p-3 border border-border dark:border-slate-700 rounded-md bg-surface dark:bg-slate-800"
                                        >
                                            <div className="flex flex-col">
                                                <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">Skill / Tech</label>
                                                <select
                                                    className="w-full px-3 py-1.5 text-sm border border-border rounded transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                    value={s.skillName}
                                                    onChange={(e) => updateEditSkill(index, 'skillName', e.target.value)}
                                                >
                                                    <option value="">Select skill or tech</option>
                                                    {skillOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">Min Exp (y)</label>
                                                    <Input
                                                        className="px-3 py-1.5 text-sm"
                                                        type="number"
                                                        min={0}
                                                        placeholder="0"
                                                        value={s.minimumExperience === 0 ? '' : s.minimumExperience}
                                                        onChange={(e) => updateEditSkill(index, 'minimumExperience', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">Priority</label>
                                                    <select
                                                        value={s.priority}
                                                        onChange={(e) => updateEditSkill(index, 'priority', e.target.value as CreateSkillInput['priority'])}
                                                        className="w-full px-3 py-1.5 text-sm border border-border rounded transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                    >
                                                        <option value="Must-have">Must-have</option>
                                                        <option value="Nice-to-have">Nice-to-have</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-1">Weight (1–10)</label>
                                                    <Input
                                                        className="px-3 py-1.5 text-sm w-full"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        placeholder="5"
                                                        value={s.weight === 0 ? '' : s.weight}
                                                        onChange={(e) => updateEditSkill(index, 'weight', Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 5)))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditSkill(index)}
                                                    className="text-error hover:text-error-700 transition-colors px-2 py-1 rounded text-xs hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center gap-1"
                                                    aria-label="Remove skill"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Send form to client modal */}
            <Modal
                isOpen={isSendFormOpen}
                onClose={closeSendFormModal}
                title="Send form to client"
                footer={
                    <div className="flex justify-end gap-3">
                        {formUrl ? (
                            <Button variant="primary" onClick={closeSendFormModal}>
                                Done
                            </Button>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={closeSendFormModal} disabled={isSendingForm}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSendFormToClient} isLoading={isSendingForm} disabled={!sendFormEmail.trim()}>
                                    Send & copy link
                                </Button>
                            </>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    {formUrl ? (
                        <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                            <p className="text-sm font-medium text-success-800 dark:text-success-200 mb-2">
                                Form link created and copied to clipboard. Email sent to {sendFormEmail}.
                            </p>
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 break-all">{formUrl}</p>
                            <p className="text-xs text-secondary-500 mt-2">
                                Client submits the form to add project as Draft.
                            </p>
                        </div>
                    ) : (
                        <>
                            <Input
                                label="Client email *"
                                type="email"
                                placeholder="client@company.com"
                                value={sendFormEmail}
                                onChange={(e) => setSendFormEmail(e.target.value)}
                            />
                            <Input
                                label="Client name (optional)"
                                placeholder="e.g., John Doe"
                                value={sendFormName}
                                onChange={(e) => setSendFormName(e.target.value)}
                            />
                            <p className="text-xs text-secondary-600 dark:text-secondary-400">
                                A unique form link will be generated and emailed to the client. When they submit, the project will be created as Draft.
                            </p>
                        </>
                    )}
                </div>
            </Modal>
        </MainLayout>
    );
};
