// Employee types
export interface Employee {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: string;
    // ER diagram fields
    availability_status?: 'Available' | 'Partially Available' | 'Unavailable';
    total_experience_years?: number;
    communication_score?: number;
    teamwork_score?: number;
    performance_rating?: number;
    error_rate?: number;
    location?: string;
    // Legacy fields (kept for backward compat)
    availability?: EmployeeAvailability;
    skills?: LegacyEmployeeSkill[];
    experience?: number;
    pastProjectScore?: number;
    photoUrl?: string;
    accessRole?: 'Admin' | 'Manager' | 'Employee';
    createdAt: string;
    updatedAt: string;
}

// Legacy embedded employee skill (from old schema)
export interface LegacyEmployeeSkill {
    id: string;
    skillId: string;
    skillName: string;
    yearsOfExperience: number;
    proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface EmployeeAvailability {
    status: 'Available' | 'Partially Available' | 'Unavailable';
    currentProject?: string; // Name of the current project, or undefined if available
    currentWorkload: number; // Percentage 0-100
    availableFrom?: string; // ISO date string
}

// Project types
export interface Project {
    id: string;
    name: string;
    description: string;
    duration: number; // In months
    priority: 'Low' | 'Medium' | 'High';
    deadline: string; // ISO date string
    status: 'Draft' | 'Active' | 'Completed' | 'Archived';
    requiredSkills: ProjectSkillRequirement[];
    teamPreferences: TeamPreferences;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    progress?: number; // Percentage 0-100
}

export interface ProjectSkillRequirement {
    id: string;
    skillId: string;
    skillName: string;
    minimumExperience: number; // Years
    priority: 'Must-have' | 'Nice-to-have';
    weight: number; // 0-100 percentage for matching algorithm
}

export interface TeamPreferences {
    teamSize: number;
    seniorityMix: {
        junior: number; // Percentage
        mid: number;
        senior: number;
    };
}

// Team types
export interface Team {
    id: string;
    projectId: string;
    teamName: string;
    members: TeamMember[];
    matchScore: number; // Percentage 0-100
    skillCoverage: SkillCoverage[];
    status: 'Recommended' | 'Under Review' | 'Approved' | 'Rejected';
    createdAt: string;
    updatedAt: string;
}

export interface TeamMember {
    employeeId: string;
    employee: Employee;
    role: string;
    matchPercentage: number; // 0-100
    skillsMatched: string[];
}

export interface SkillCoverage {
    skillId: string;
    skillName: string;
    required: boolean;
    coverage: number; // Percentage 0-100
    status: 'Covered' | 'Partial' | 'Missing';
}

// Skill types
export interface Skill {
    id: string;
    skill_name: string;
    skill_category: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}

// Employee-Skill types (EMPLOYEE_SKILLS join table)
export interface EmployeeSkill {
    id: string;
    emp_id: string | Employee;
    skill_id: string | Skill;
    proficiency_level: number; // 1-5
    years_experience: number;
    last_used_year: number;
    createdAt: string;
    updatedAt: string;
}

// Allocation types (ALLOCATIONS table)
export interface Allocation {
    id: string;
    emp_id: string | Employee;
    project_id: string | Project;
    allocation_start_date: string;
    allocation_end_date: string | null;
    allocation_percentage: number; // 1-100
    createdAt: string;
    updatedAt: string;
}

// Employee Project History types (EMPLOYEE_PROJECT_HISTORY)
export interface EmployeeProjectHistory {
    id: string;
    emp_id: string | Employee;
    project_id: string | Project;
    role_in_project: string;
    performance_feedback: number | null;
    allocation_percentage: number;
    domain_experience_year: number;
    createdAt: string;
    updatedAt: string;
}


// ML Team Formation types
export interface TeamCandidateBreakdown {
    skill_cosine_similarity: number;
    availability: number;
    performance_rating: number;
    communication_score: number;
    teamwork_score: number;
    experience: number;
    error_rate_score: number;
    client_feedback: number;
}

export interface TeamCandidate {
    rank: number;
    id: string;
    name: string;
    role: string;
    department: string;
    availability_status: string;
    total_experience_years: number;
    seniority: 'junior' | 'mid' | 'senior';
    projects_count: number;
    avg_client_feedback: number | null;
    final_score: number;
    match_percentage: number;
    recommended: boolean;
    team_seniority_balance: number;
    new_skills_contributed?: string[];
    optimal_allocation_pct?: number;
    current_project?: string;
    matching_skills: string[];
    skill_gap: {
        missing_skills: string[];
        weak_skills: string[];
        gap_count: number;
    };
    score_breakdown: TeamCandidateBreakdown;
}

export interface TeamRecommendation {
    team_size_requested: number;
    total_candidates: number;
    recommended_team: TeamCandidate[];
    all_candidates: TeamCandidate[];
    algorithm: string;
    skill_coverage: Record<string, {
        covered: boolean;
        priority: string;
        contributors: Array<{ name: string; proficiency: number }>;
    }>;
}

// Analytics types
export interface KPI {
    label: string;
    value: number;
    change: number; // Percentage change
    trend: 'up' | 'down' | 'neutral';
    icon: string;
}

export interface ChartData {
    label: string;
    value: number;
    [key: string]: string | number;
}

// Auth types
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Manager' | 'Employee';
    photoUrl?: string;
    organizationId: string;
    organizationName: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    user: User;
    token: string;
}

export interface RegisterRequest {
    companyName: string;
    location: string;
    email: string;
    password: string;
    companySize?: string;
    website?: string;
}

// API Response types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    statusCode: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Form types
export interface EmployeeFormData {
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: string;
    skills: Array<{
        skillId: string;
        yearsOfExperience: number;
        proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    }>;
    availability: {
        status: 'Available' | 'Partially Available' | 'Unavailable';
        currentWorkload: number;
    };
    pastProjectScore?: number;
}

export interface ProjectFormData {
    name: string;
    description: string;
    duration: number;
    priority: 'Low' | 'Medium' | 'High';
    deadline: string;
    requiredSkills: Array<{
        skillId: string;
        minimumExperience: number;
        priority: 'Must-have' | 'Nice-to-have';
        weight: number;
    }>;
    teamPreferences: {
        teamSize: number;
        seniorityMix: {
            junior: number;
            mid: number;
            senior: number;
        };
    };
}

// Filter types
export interface EmployeeFilters {
    search?: string;
    department?: string;
    skills?: string[];
    availability?: EmployeeAvailability['status'];
}

export interface ProjectFilters {
    search?: string;
    status?: Project['status'];
    priority?: Project['priority'];
}

// Table types
export interface TableColumn<T> {
    key: keyof T | string;
    label: string;
    sortable?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
}

export interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}
