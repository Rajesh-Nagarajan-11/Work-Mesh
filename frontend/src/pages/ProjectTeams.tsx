import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users2, Plus, Calendar, Trash2, Bot, ChevronDown, ChevronUp, Star, CheckCircle, RefreshCw, Cpu, Database, GitBranch, Zap, Network } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { projectService } from '../services/projectService';
import { employeeService } from '../services/employeeService';
import { allocationService } from '../services/allocationService';
import type { Project, Employee, Allocation, TeamRecommendation, TeamCandidate } from '../types';

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
};

const SENIORITY_COLORS: Record<string, string> = {
    senior: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300',
    mid: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300',
    junior: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300',
};




// ── Analysis Engine Steps ────────────────────────────────────────────────────
const ML_STEPS = [
    { icon: Database, label: 'Retrieving workforce corpus & allocation ledger', detail: 'Async motor cursor · MongoDB aggregation pipeline...' },
    { icon: Network, label: 'Constructing high-dimensional skill embeddings', detail: 'Proficiency normalisation → [0, 1] feature space...' },
    { icon: Cpu, label: 'Executing pairwise Cosine Similarity computation', detail: 'sklearn.metrics.pairwise · numpy broadcast matrix...' },
    { icon: Zap, label: 'Enforcing temporal scheduling constraints', detail: 'Allen\'s interval overlap algebra · residual capacity...' },
    { icon: GitBranch, label: 'Solving Marginal Utility optimisation problem', detail: 'Proficiency-weighted diminishing returns · greedy set cover...' },
    { icon: CheckCircle, label: 'Synthesising team composition & allocation weights', detail: 'Proportional score-based workload distribution...' },
];

const MLLoadingOverlay: React.FC<{ step: number; progress: number }> = ({ step, progress }) => (
    <div className="rounded-xl border-2 border-primary/30 overflow-hidden relative
        bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
        p-6 space-y-5 shadow-sm">

        {/* Animated scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                style={{ top: `${progress % 100}%`, transition: 'top 0.5s linear' }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40">
                    <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                </span>
            </div>
            <div>
                <h3 className="text-sm font-bold text-secondary-900 dark:text-white tracking-wide">ALGORITHMIC ANALYSIS ENGINE</h3>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-mono">Marginal Utility Maximisation · Cosine Similarity · Greedy Set Cover</p>
            </div>
            <div className="ml-auto text-right">
                <span className="text-2xl font-mono font-bold text-primary-600 dark:text-primary-400">{progress.toFixed(0)}%</span>
                <p className="text-xs text-secondary-500 dark:text-slate-500">complete</p>
            </div>
        </div>

        {/* Master progress bar */}
        <div className="h-2 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-primary
                bg-[length:200%] animate-[shimmer_1.5s_linear_infinite] transition-all duration-500"
                style={{ width: `${progress}%` }} />
        </div>

        {/* Step list */}
        <div className="space-y-1">
            {ML_STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                    <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${active ? 'bg-primary/10 border border-primary/20 dark:border-primary/30' :
                        done ? 'opacity-50' : 'opacity-30'
                        }`}>
                        <div className={`mt-0.5 flex-shrink-0 ${done ? 'text-emerald-500 dark:text-green-400' :
                            active ? 'text-primary-600 dark:text-primary-400 animate-pulse' :
                                'text-secondary-400 dark:text-slate-600'
                            }`}>
                            {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-xs font-semibold ${done ? 'text-emerald-600 dark:text-green-400' :
                                active ? 'text-secondary-900 dark:text-white' :
                                    'text-secondary-400 dark:text-slate-600'
                                }`}>{s.label}</p>
                            {active && (
                                <p className="text-xs text-primary-600 dark:text-primary-400 font-mono mt-0.5 truncate">{s.detail}</p>
                            )}
                        </div>
                        {active && (
                            <div className="ml-auto flex gap-0.5">
                                {[0, 1, 2].map(d => (
                                    <div key={d} className="w-1 h-3 bg-primary rounded-full animate-bounce"
                                        style={{ animationDelay: `${d * 0.15}s` }} />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Live counter row */}
        <div className="grid grid-cols-3 gap-2 border-t border-secondary-100 dark:border-slate-700 pt-3">
            {[
                { label: 'Candidates scored', value: step >= 1 ? Math.min(step * 7 + 4, 30) : 0 },
                { label: 'Skill vectors built', value: step >= 2 ? Math.min(step * 5, 24) : 0 },
                { label: 'Iterations run', value: step >= 4 ? Math.min((step - 3) * 12, 48) : 0 },
            ].map(({ label, value }) => (
                <div key={label} className="text-center">
                    <p className="font-mono font-bold text-primary-600 dark:text-primary-400 text-lg">{value}</p>
                    <p className="text-xs text-secondary-500 dark:text-slate-500">{label}</p>
                </div>
            ))}
        </div>
    </div>
);



// ── Score Ring ────────────────────────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 52 }) => {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';
    return (
        <svg width={size} height={size} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={6} fill="none" />
            <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="54%" textAnchor="middle" fontSize={size < 50 ? 9 : 11} fill={color} fontWeight="bold">
                {score.toFixed(0)}%
            </text>
        </svg>
    );
};

// ── Score Bar ─────────────────────────────────────────────────────────────────
const ScoreBar: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = 'bg-primary' }) => (
    <div>
        <div className="flex justify-between text-xs mb-0.5">
            <span className="text-secondary-600 dark:text-secondary-400">{label}</span>
            <span className="font-medium text-secondary-800 dark:text-secondary-200">{value.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
        </div>
    </div>
);

// ── Candidate Profile Card ────────────────────────────────────────────────────
const AVAIL_BADGE: Record<string, string> = {
    'Available': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Partially Available': 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
    'Unavailable': 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};
const AVATAR_GRADIENT = [
    'from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600', 'from-pink-500 to-rose-600',
    'from-orange-500 to-amber-600', 'from-indigo-500 to-blue-600',
];

const CandidateCard: React.FC<{
    candidate: TeamCandidate;
    onAllocate: (id: string, name: string) => void;
    onConfigure: (id: string, name: string) => void;
    isAllocated: boolean;
}> = ({ candidate: c, onAllocate, onConfigure, isAllocated }) => {
    const [expanded, setExpanded] = useState(false);
    const bd = c.score_breakdown;
    const initials = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const gradient = AVATAR_GRADIENT[c.name.charCodeAt(0) % AVATAR_GRADIENT.length];

    return (
        <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
            bg-white dark:bg-slate-800
            ${c.recommended
                ? 'border-primary/50 shadow-md shadow-primary/10 dark:shadow-primary/5'
                : 'border-border dark:border-slate-700'}`}>

            {/* AI pick top accent bar */}
            {c.recommended && <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-primary" />}

            <div className="p-5 space-y-4">
                {/* Profile row */}
                <div className="flex items-start gap-4">
                    {/* Gradient avatar */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient}
                        flex items-center justify-center text-white font-bold text-base shadow-sm`}>
                        {initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-secondary-900 dark:text-white">{c.name}</h4>
                            {c.recommended && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:text-primary-300 truncate max-w-[200px]"
                                    title={c.new_skills_contributed?.join(', ')}>
                                    {(c.new_skills_contributed && c.new_skills_contributed.length > 0)
                                        ? `Handling: ${c.new_skills_contributed.join(', ')}`
                                        : (c.optimal_allocation_pct ? `Allocation: ${c.optimal_allocation_pct}%` : 'Recommended')}
                                </span>
                            )}
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${SENIORITY_COLORS[c.seniority]}`}>
                                {c.seniority}
                            </span>
                        </div>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{c.role} · {c.department}</p>
                        <span className={`inline-block text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full
                            ${AVAIL_BADGE[c.availability_status] ?? 'bg-secondary-100 text-secondary-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {c.availability_status}
                        </span>
                    </div>
                    {/* Score ring */}
                    <ScoreRing score={c.match_percentage} />
                </div>

                {/* Matched skills pills */}
                {c.matching_skills && c.matching_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {c.matching_skills.map((skill: string) => (
                            <span key={skill}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
                                    bg-emerald-50 text-emerald-700 border border-emerald-200
                                    dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                ✓ {skill}
                            </span>
                        ))}
                    </div>
                )}

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                        { label: 'Experience', value: `${c.total_experience_years}yr` },
                        { label: 'Projects', value: `${c.projects_count}` },
                        { label: 'Feedback', value: c.avg_client_feedback != null ? `${c.avg_client_feedback.toFixed(1)}/10` : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-secondary-50 dark:bg-slate-700/60 px-2 py-2">
                            <p className="text-xs font-bold text-secondary-900 dark:text-white">{value}</p>
                            <p className="text-[10px] text-secondary-500 dark:text-secondary-400">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                {isAllocated ? (
                    <div className="flex items-center justify-center gap-2 py-2 rounded-xl
                        bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Added to Team</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onConfigure(c.id, c.name)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                                border border-border dark:border-slate-600
                                text-secondary-700 dark:text-secondary-300
                                bg-white dark:bg-slate-700
                                hover:bg-secondary-50 dark:hover:bg-slate-600 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                            Manual Configure
                        </button>
                        <button onClick={() => onAllocate(c.id, c.name)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                                bg-primary text-white hover:bg-primary/90
                                transition-colors shadow-sm shadow-primary/30">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Accept
                        </button>
                    </div>
                )}
            </div>

            {/* Collapsible score breakdown */}
            <div className="border-t border-border dark:border-slate-700">
                <button onClick={() => setExpanded(x => !x)}
                    className="w-full flex items-center justify-between px-5 py-2.5 text-xs
                        text-secondary-500 dark:text-secondary-400
                        hover:bg-secondary-50 dark:hover:bg-slate-700/50 transition-colors">
                    <span>Score breakdown</span>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expanded && (
                    <div className="px-5 pb-4 pt-2 space-y-2 bg-secondary-50/50 dark:bg-slate-700/20">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            <ScoreBar label="Skill Match (Cosine)" value={bd.skill_cosine_similarity} color="bg-primary" />
                            <ScoreBar label="Availability" value={bd.availability} color="bg-emerald-500" />
                            <ScoreBar label="Performance" value={bd.performance_rating} color="bg-blue-500" />
                            <ScoreBar label="Communication" value={bd.communication_score} color="bg-purple-500" />
                            <ScoreBar label="Teamwork" value={bd.teamwork_score} color="bg-pink-500" />
                            <ScoreBar label="Experience" value={bd.experience} color="bg-orange-500" />
                            <ScoreBar label="Error Rate" value={bd.error_rate_score} color="bg-teal-500" />
                            <ScoreBar label="Client Feedback" value={bd.client_feedback} color="bg-yellow-500" />
                        </div>
                        <p className="text-[10px] text-secondary-400 dark:text-secondary-600 pt-1">
                            {c.total_experience_years}yr exp · {c.projects_count} past projects · Seniority balance: {c.team_seniority_balance}%
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};



// ── Main Page ─────────────────────────────────────────────────────────────────
export const ProjectTeams: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [project, setProject] = useState<Project | null>(null);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // AI recommendation state
    const [recommendation, setRecommendation] = useState<TeamRecommendation | null>(null);
    const [isRecommending, setIsRecommending] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [showAll, setShowAll] = useState(false);
    const [excludeUnavailable, setExcludeUnavailable] = useState(false);
    const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Add allocation modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [prefilledEmpId, setPrefilledEmpId] = useState('');
    const [addForm, setAddForm] = useState({
        emp_id: '',
        allocation_start_date: new Date().toISOString().split('T')[0],
        allocation_end_date: '',
        allocation_percentage: 100,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!id) { setIsLoading(false); return; }
        Promise.all([
            projectService.getProject(id),
            allocationService.getByProject(id),
            employeeService.getEmployees(),
        ])
            .then(([proj, allocs, emps]) => {
                setProject(proj);
                setAllocations(allocs);
                setEmployees(emps);
            })
            .catch(() => setProject(null))
            .finally(() => setIsLoading(false));
    }, [id]);

    // Pre-fill emp_id when opening modal from AI panel
    useEffect(() => {
        if (prefilledEmpId) {
            setAddForm((f) => ({ ...f, emp_id: prefilledEmpId }));
        }
    }, [prefilledEmpId]);

    const handleGetRecommendation = async () => {
        if (!id) return;
        setIsRecommending(true);
        setLoadingStep(0);
        setLoadingProgress(2);

        // Total sim time = 1 500 ms → guarantees ≥ 1.5 s visible loading.
        // Promise.all ensures we wait for BOTH the API AND the minimum timer.
        const STEP_DURATIONS = [200, 280, 370, 250, 270, 130]; // total ≈ 1 500 ms
        const MIN_DISPLAY_MS = 1500; // guaranteed minimum loading duration
        let stepIndex = 0;
        let elapsed = 0;
        const totalSimTime = STEP_DURATIONS.reduce((a, b) => a + b, 0);

        loadingTimerRef.current = setInterval(() => {
            elapsed += 80;
            const boundary = STEP_DURATIONS.slice(0, stepIndex + 1).reduce((a, b) => a + b, 0);
            if (elapsed >= boundary && stepIndex < ML_STEPS.length - 1) stepIndex += 1;
            setLoadingStep(stepIndex);
            setLoadingProgress(Math.min(95, (elapsed / totalSimTime) * 100));
        }, 80);

        try {
            // Run API + minimum timer in parallel — wait for BOTH to finish
            const [result] = await Promise.all([
                projectService.recommendTeam(id, excludeUnavailable),
                new Promise<void>(r => setTimeout(r, MIN_DISPLAY_MS)),
            ]);
            // Complete animation
            if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
            setLoadingStep(ML_STEPS.length - 1);
            setLoadingProgress(100);
            await new Promise(r => setTimeout(r, 500)); // flash 100%
            setRecommendation(result);
        } catch {
            addToast('error', 'ML service unavailable. Make sure the Python server is running on port 8000.');
        } finally {
            if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
            setIsRecommending(false);
            setLoadingStep(0);
            setLoadingProgress(0);
        }
    };


    // Cleanup timer on unmount
    useEffect(() => () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); }, []);

    const handleAllocateFromAI = (empId: string, _name: string) => {
        setPrefilledEmpId(empId);
        setIsAddOpen(true);
    };

    const handleAddAllocation = async () => {
        if (!id || !addForm.emp_id) return;
        setIsSaving(true);
        try {
            const created = await allocationService.createAllocation({
                emp_id: addForm.emp_id ?? '',
                project_id: id,
                allocation_start_date: addForm.allocation_start_date ?? '',
                allocation_end_date: addForm.allocation_end_date || null,
                allocation_percentage: Number(addForm.allocation_percentage),
            });
            setAllocations((prev) => [created, ...prev]);
            setIsAddOpen(false);
            setPrefilledEmpId('');
            setAddForm({ emp_id: '', allocation_start_date: new Date().toISOString().split('T')[0], allocation_end_date: '', allocation_percentage: 100 });
            addToast('success', 'Team member allocated');
        } catch {
            addToast('error', 'Failed to allocate member');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAllocation = async (allocationId: string) => {
        if (!confirm('Remove this allocation?')) return;
        try {
            await allocationService.deleteAllocation(allocationId);
            setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
            addToast('success', 'Allocation removed');
        } catch {
            addToast('error', 'Failed to remove allocation');
        }
    };

    const allocatedEmpIds = new Set(
        allocations.map((a) => (typeof a.emp_id === 'string' ? a.emp_id : (a.emp_id as Employee).id))
    );
    const availableEmployees = employees.filter((e) => !allocatedEmpIds.has(e.id));

    const displayedCandidates = recommendation
        ? (showAll ? recommendation.all_candidates : recommendation.recommended_team)
        : [];

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
            </MainLayout>
        );
    }

    if (!project) {
        return (
            <MainLayout>
                <EmptyState icon={<Users2 className="w-16 h-16" />} title="Project not found"
                    description="This project may have been deleted or the link is invalid."
                    action={{ label: 'Back to Projects', onClick: () => navigate('/projects') }} />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <Link to={`/projects/${project.id}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-secondary-600 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white">
                        <ArrowLeft className="w-4 h-4" /> Back to Project
                    </Link>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => navigate('/projects')}>All Projects</Button>
                        <Button onClick={() => setIsAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}
                            disabled={availableEmployees.length === 0}>
                            Add Member
                        </Button>
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">Team</h1>
                    <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                        Members for <span className="font-semibold">{project.name}</span>
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-secondary-900 dark:text-white">{allocations.length}</p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Team Members</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-secondary-900 dark:text-white">{project.teamPreferences?.teamSize ?? '—'}</p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Target Size</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-primary-600">
                            {allocations.length > 0
                                ? Math.round(allocations.reduce((s, a) => s + (a.allocation_percentage ?? 0), 0) / allocations.length)
                                : 0}%
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Avg Allocation</p>
                    </div>
                </div>

                {/* ── Intelligent Team Formation Engine ──────────────────── */}
                <div className="card p-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                                <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Intelligent Team Formation</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400 cursor-pointer">
                                <input type="checkbox" checked={excludeUnavailable}
                                    onChange={(e) => setExcludeUnavailable(e.target.checked)}
                                    className="rounded border-border" />
                                Hide unavailable
                            </label>
                            <Button onClick={handleGetRecommendation} isLoading={isRecommending}
                                leftIcon={isRecommending ? undefined : <RefreshCw className="w-4 h-4" />}>
                                {recommendation ? 'Re-analyse Candidates' : 'Initiate Candidate Analysis'}
                            </Button>
                        </div>
                    </div>

                    {/* Computational loading overlay — shown during analysis */}
                    {isRecommending && (
                        <MLLoadingOverlay step={loadingStep} progress={loadingProgress} />
                    )}

                    {recommendation && !isRecommending && (
                        <>
                            {/* Seniority balance */}
                            {recommendation.recommended_team[0] && (
                                <div className="flex items-center gap-3">
                                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-0.5">
                                            <span className="text-secondary-600 dark:text-secondary-400">Seniority Balance Score</span>
                                            <span className="font-bold text-secondary-900 dark:text-white">
                                                {recommendation.recommended_team[0].team_seniority_balance}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-secondary-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-yellow-500 rounded-full"
                                                style={{ width: `${recommendation.recommended_team[0].team_seniority_balance}%` }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Candidate cards grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {displayedCandidates.map((c) => (
                                    <CandidateCard key={c.id} candidate={c}
                                        onAllocate={handleAllocateFromAI}
                                        onConfigure={handleAllocateFromAI}
                                        isAllocated={allocatedEmpIds.has(c.id)} />
                                ))}
                            </div>

                            <button onClick={() => setShowAll((x) => !x)}
                                className="w-full py-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline transition-colors">
                                {showAll
                                    ? '▲ Show only recommended team'
                                    : `▼ Show all ${recommendation.total_candidates} candidates`}
                            </button>
                        </>
                    )}
                </div>

                {/* ── Current Allocations ──────────────────────────────── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-border dark:border-slate-700 overflow-hidden">
                    {allocations.length === 0 ? (
                        <div className="p-8">
                            <EmptyState icon={<Users2 className="w-12 h-12" />} title="No team members yet"
                                description="Use the algorithmic recommendations above or click 'Add Member' to allocate manually."
                                action={{ label: 'Add Member', onClick: () => setIsAddOpen(true) }} />
                        </div>
                    ) : (
                        <div className="divide-y divide-border dark:divide-slate-700">
                            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-surface dark:bg-slate-900 text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wide">
                                <div className="col-span-4">Employee</div>
                                <div className="col-span-2">Allocation %</div>
                                <div className="col-span-3">Start Date</div>
                                <div className="col-span-2">End Date</div>
                                <div className="col-span-1"></div>
                            </div>
                            {allocations.map((alloc) => {
                                const emp = typeof alloc.emp_id === 'object' ? alloc.emp_id as Employee : employees.find((e) => e.id === alloc.emp_id);
                                return (
                                    <div key={alloc.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-secondary-50 dark:hover:bg-slate-700/40">
                                        <div className="col-span-4 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                    {emp?.name?.charAt(0).toUpperCase() ?? '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{emp?.name ?? '—'}</p>
                                                    <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">{emp?.role ?? ''}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`text-sm font-bold ${alloc.allocation_percentage >= 100 ? 'text-error-600' : alloc.allocation_percentage >= 50 ? 'text-warning-600' : 'text-success-600'}`}>
                                                {alloc.allocation_percentage}%
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-sm text-secondary-600 dark:text-secondary-400">{formatDate(alloc.allocation_start_date)}</div>
                                        <div className="col-span-2 text-sm text-secondary-600 dark:text-secondary-400">{formatDate(alloc.allocation_end_date)}</div>
                                        <div className="col-span-1 flex justify-end">
                                            <button onClick={() => handleRemoveAllocation(alloc.id)}
                                                className="p-1.5 rounded-md text-secondary-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors" title="Remove">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Allocation Modal */}
            <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setPrefilledEmpId(''); }}
                title="Allocate Team Member" size="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => { setIsAddOpen(false); setPrefilledEmpId(''); }}>Cancel</Button>
                        <Button onClick={handleAddAllocation} isLoading={isSaving} disabled={!addForm.emp_id || isSaving}>Allocate</Button>
                    </div>
                }>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Employee *</label>
                        <select value={addForm.emp_id}
                            onChange={(e) => setAddForm((f) => ({ ...f, emp_id: e.target.value }))}
                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                            <option value="">Select employee…</option>
                            {availableEmployees.map((e) => (
                                <option key={e.id} value={e.id}>{e.name} — {e.role} ({e.availability_status ?? 'Available'})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Date *" type="date" leftIcon={<Calendar className="w-4 h-4" />}
                            value={addForm.allocation_start_date}
                            onChange={(e) => setAddForm((f) => ({ ...f, allocation_start_date: e.target.value }))} />
                        <Input label="End Date" type="date" leftIcon={<Calendar className="w-4 h-4" />}
                            value={addForm.allocation_end_date}
                            onChange={(e) => setAddForm((f) => ({ ...f, allocation_end_date: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Allocation % (1–100)</label>
                        <input type="number" min={1} max={100} value={addForm.allocation_percentage}
                            onChange={(e) => setAddForm((f) => ({ ...f, allocation_percentage: Number(e.target.value) }))}
                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                </div>
            </Modal>
        </MainLayout>
    );
};
