import type { Project } from '../types';

export const PROJECTS_STORAGE_KEY = 'workmesh_projects';

export const DEFAULT_PROJECTS: Project[] = [
    {
        id: 'p1',
        name: 'Work Mesh v1',
        description: 'Build the MVP for AI-assisted team formation and staffing insights.',
        duration: 4,
        priority: 'High',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
        status: 'Active',
        progress: 62,
        requiredSkills: [
            { id: 'rs1', skillId: 'react', skillName: 'React', minimumExperience: 1, priority: 'Must-have', weight: 40 },
            { id: 'rs2', skillId: 'ts', skillName: 'TypeScript', minimumExperience: 1, priority: 'Must-have', weight: 40 },
            { id: 'rs3', skillId: 'ui', skillName: 'UI/UX', minimumExperience: 1, priority: 'Nice-to-have', weight: 20 },
        ],
        teamPreferences: {
            teamSize: 6,
            seniorityMix: { junior: 40, mid: 40, senior: 20 },
        },
        createdBy: 'admin',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'p2',
        name: 'Skill Taxonomy Cleanup',
        description: 'Normalize skill tags and consolidate duplicates across departments.',
        duration: 2,
        priority: 'Medium',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
        status: 'Draft',
        progress: 10,
        requiredSkills: [
            { id: 'rs4', skillId: 'data', skillName: 'Data Modeling', minimumExperience: 2, priority: 'Must-have', weight: 60 },
            { id: 'rs5', skillId: 'pm', skillName: 'Project Mgmt', minimumExperience: 2, priority: 'Nice-to-have', weight: 40 },
        ],
        teamPreferences: {
            teamSize: 3,
            seniorityMix: { junior: 20, mid: 60, senior: 20 },
        },
        createdBy: 'manager',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
        id: 'p3',
        name: 'Onboarding Portal',
        description: 'Create a lightweight onboarding portal and documentation hub.',
        duration: 3,
        priority: 'Low',
        deadline: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        status: 'Completed',
        progress: 100,
        requiredSkills: [
            { id: 'rs6', skillId: 'content', skillName: 'Technical Writing', minimumExperience: 1, priority: 'Must-have', weight: 50 },
            { id: 'rs7', skillId: 'web', skillName: 'Web', minimumExperience: 1, priority: 'Nice-to-have', weight: 50 },
        ],
        teamPreferences: {
            teamSize: 4,
            seniorityMix: { junior: 30, mid: 50, senior: 20 },
        },
        createdBy: 'admin',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 50).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
    {
        id: 'p4',
        name: 'Mobile App Development',
        description: 'Build a cross-platform mobile app for employee self-service and project tracking.',
        duration: 6,
        priority: 'High',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
        status: 'Active',
        progress: 35,
        requiredSkills: [
            { id: 'rs8', skillId: 'react-native', skillName: 'React Native', minimumExperience: 2, priority: 'Must-have', weight: 50 },
            { id: 'rs9', skillId: 'mobile-ui', skillName: 'Mobile UI/UX', minimumExperience: 2, priority: 'Must-have', weight: 30 },
            { id: 'rs10', skillId: 'api', skillName: 'REST API', minimumExperience: 1, priority: 'Nice-to-have', weight: 20 },
        ],
        teamPreferences: {
            teamSize: 5,
            seniorityMix: { junior: 30, mid: 50, senior: 20 },
        },
        createdBy: 'admin',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'p5',
        name: 'Analytics Dashboard',
        description: 'Design and implement a real-time analytics dashboard for resource utilization and project metrics.',
        duration: 5,
        priority: 'Medium',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
        status: 'Draft',
        progress: 5,
        requiredSkills: [
            { id: 'rs11', skillId: 'data-viz', skillName: 'Data Visualization', minimumExperience: 2, priority: 'Must-have', weight: 40 },
            { id: 'rs12', skillId: 'sql', skillName: 'SQL', minimumExperience: 2, priority: 'Must-have', weight: 40 },
            { id: 'rs13', skillId: 'bi', skillName: 'Business Intelligence', minimumExperience: 3, priority: 'Nice-to-have', weight: 20 },
        ],
        teamPreferences: {
            teamSize: 4,
            seniorityMix: { junior: 25, mid: 50, senior: 25 },
        },
        createdBy: 'manager',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    },
    {
        id: 'p6',
        name: 'Security Audit & Compliance',
        description: 'Conduct comprehensive security audit and implement compliance measures for SOC 2 certification.',
        duration: 8,
        priority: 'High',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
        status: 'Active',
        progress: 20,
        requiredSkills: [
            { id: 'rs14', skillId: 'security', skillName: 'Cybersecurity', minimumExperience: 3, priority: 'Must-have', weight: 50 },
            { id: 'rs15', skillId: 'compliance', skillName: 'Compliance', minimumExperience: 2, priority: 'Must-have', weight: 30 },
            { id: 'rs16', skillId: 'devops', skillName: 'DevOps', minimumExperience: 2, priority: 'Nice-to-have', weight: 20 },
        ],
        teamPreferences: {
            teamSize: 3,
            seniorityMix: { junior: 0, mid: 40, senior: 60 },
        },
        createdBy: 'admin',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
];

export function loadProjects(): Project[] {
    try {
        const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (!raw) return DEFAULT_PROJECTS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_PROJECTS;
        return parsed as Project[];
    } catch {
        return DEFAULT_PROJECTS;
    }
}

export function saveProjects(projects: Project[]) {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

