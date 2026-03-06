/**
 * seed.js — One-time database seeder for Work-Mesh
 *
 * Creates:
 *  - 1 Organization:  "Work Mesh Corp"
 *  - 1 Admin account: admin@workmesh.com / Rajesh@2004  (bcrypt-hashed)
 *  - 1 Manager:       manager@workmesh.com / Rajesh@2004
 *  - 26 Skills across Frontend, Backend, Cloud, Data, Mobile, Design & QA categories
 *  - 50 Employees with realistic ER fields + EmployeeSkill links
 *  - 10 Projects with requiredSkills and teamPreferences
 *  - EmployeeProjectHistory (past feedback) for 30 employees
 *
 * Idempotent: skips seeding if admin@workmesh.com already exists.
 *
 * Usage:  node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Organization = require('./src/models/Organization');
const Employee = require('./src/models/Employee');
const Skill = require('./src/models/Skill');
const EmployeeSkill = require('./src/models/EmployeeSkill');
const Project = require('./src/models/Project');
const EmployeeProjectHistory = require('./src/models/EmployeeProjectHistory');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workmesh';
const ADMIN_PASSWORD = 'Rajesh@2004';

// ─────────────────────────── helpers ────────────────────────────────────────
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// ─────────────────────────── static data ─────────────────────────────────────
const SKILL_DEFS = [
    // Frontend
    { name: 'React', cat: 'Frontend' },
    { name: 'Vue.js', cat: 'Frontend' },
    { name: 'Angular', cat: 'Frontend' },
    { name: 'TypeScript', cat: 'Frontend' },
    { name: 'UI/UX Design', cat: 'Design' },
    { name: 'HTML/CSS', cat: 'Frontend' },
    // Backend
    { name: 'Node.js', cat: 'Backend' },
    { name: 'Python', cat: 'Backend' },
    { name: 'Java', cat: 'Backend' },
    { name: 'Go', cat: 'Backend' },
    { name: 'REST API', cat: 'Backend' },
    { name: 'GraphQL', cat: 'Backend' },
    // Database
    { name: 'MongoDB', cat: 'Database' },
    { name: 'PostgreSQL', cat: 'Database' },
    { name: 'MySQL', cat: 'Database' },
    { name: 'Redis', cat: 'Database' },
    // Cloud / DevOps
    { name: 'AWS', cat: 'Cloud' },
    { name: 'Azure', cat: 'Cloud' },
    { name: 'Docker', cat: 'DevOps' },
    { name: 'Kubernetes', cat: 'DevOps' },
    { name: 'CI/CD', cat: 'DevOps' },
    // Mobile
    { name: 'React Native', cat: 'Mobile' },
    { name: 'Flutter', cat: 'Mobile' },
    // Data
    { name: 'Machine Learning', cat: 'Data' },
    { name: 'Data Analysis', cat: 'Data' },
    // QA
    { name: 'Automated Testing', cat: 'QA' },
];

const DEPARTMENTS = ['Engineering', 'Data', 'Design', 'Mobile', 'Infrastructure', 'Quality', 'Management'];
const ROLES = ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer',
    'Data Engineer', 'DevOps Engineer', 'UX Designer', 'QA Engineer',
    'Mobile Developer', 'Tech Lead', 'Project Manager'];
const AVAIL = ['Available', 'Partially Available', 'Unavailable'];
const AVAIL_WEIGHTS = [0.6, 0.3, 0.1];   // 60% available
const FIRST_NAMES = [
    'Aarav', 'Priya', 'Arjun', 'Sneha', 'Rahul', 'Ananya', 'Vikram', 'Deepika', 'Rohan', 'Kavya',
    'Siddharth', 'Pooja', 'Kiran', 'Divya', 'Rajesh', 'Nisha', 'Suresh', 'Meera', 'Akash', 'Riya',
    'Harsh', 'Simran', 'Nikhil', 'Tanisha', 'Anil', 'Shruti', 'Ravi', 'Komal', 'Sandeep', 'Neha',
    'Dev', 'Prachi', 'Manish', 'Aarti', 'Sachin', 'Preeti', 'Varun', 'Seema', 'Abhinav', 'Rekha',
    'Gaurav', 'Geeta', 'Rohit', 'Swati', 'Naveen', 'Pallavi', 'Tarun', 'Sheetal', 'Ajay', 'Bharti',
];
const LAST_NAMES = [
    'Mehta', 'Sharma', 'Gupta', 'Verma', 'Singh', 'Patel', 'Kumar', 'Reddy', 'Nair', 'Joshi',
    'Agarwal', 'Bose', 'Choudhary', 'Das', 'Iyer', 'Khanna', 'Malhotra', 'Pandey', 'Rao', 'Shah',
];

const PROJECT_NAMES = [
    'Customer Portal Redesign',
    'Internal Analytics Dashboard',
    'Mobile Banking App',
    'E-Commerce Platform',
    'Real-Time Inventory System',
    'ML Recommendation Engine',
    'Cloud Migration Initiative',
    'DevOps Automation Pipeline',
    'Healthcare Data Platform',
    'Team Collaboration Suite',
];

// ─────────────────────────── main ────────────────────────────────────────────

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    // Idempotency guard
    const existing = await Employee.findOne({ email: 'admin@workmesh.com' });
    if (existing) {
        console.log('⚠️  admin@workmesh.com already exists – skipping seed. Delete the account first if you want to re-seed.');
        process.exit(0);
    }

    // ── 1. Organization ─────────────────────────────────────────────────────────
    const org = await Organization.create({
        companyName: 'Work Mesh Corp',
        location: 'Bangalore, India',
        companySize: '201-500',
        website: 'https://workmesh.io',
    });
    console.log('🏢 Organization created:', org.companyName);

    // ── 2. Admin + Manager (login-capable accounts) ──────────────────────────────
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await Employee.create({
        organizationId: org._id,
        name: 'Admin User',
        email: 'admin@workmesh.com',
        passwordHash,
        role: 'Admin',
        department: 'Management',
        accessRole: 'Admin',
        total_experience_years: 10,
        communication_score: 9,
        teamwork_score: 9,
        performance_rating: 9,
        error_rate: 2,
        availability_status: 'Available',
        location: 'Bangalore',
    });

    await Employee.create({
        organizationId: org._id,
        name: 'Priya Sharma',
        email: 'manager@workmesh.com',
        passwordHash,
        role: 'Project Manager',
        department: 'Management',
        accessRole: 'Manager',
        total_experience_years: 7,
        communication_score: 8,
        teamwork_score: 8,
        performance_rating: 8,
        error_rate: 3,
        availability_status: 'Available',
        location: 'Bangalore',
    });

    console.log('👤 Admin and Manager created (password: Rajesh@2004)');

    // ── 3. Skills ────────────────────────────────────────────────────────────────
    const skillDocs = await Skill.insertMany(
        SKILL_DEFS.map(s => ({
            organizationId: org._id,
            skill_name: s.name,
            skill_category: s.cat,
        }))
    );
    const skillMap = {};
    skillDocs.forEach(s => { skillMap[s.skill_name] = s._id; });
    const skillIds = skillDocs.map(s => s._id);
    console.log(`🛠️  ${skillDocs.length} skills created`);

    // ── 4. 50 Employees ──────────────────────────────────────────────────────────
    const usedNames = new Set(['Admin User', 'Priya Sharma']);
    const employees50 = [];

    for (let i = 0; i < 50; i++) {
        let fullName;
        do {
            fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        } while (usedNames.has(fullName));
        usedNames.add(fullName);

        const role = pick(ROLES);
        const dept = pick(DEPARTMENTS);
        const exp = rnd(0, 15);
        const rand = Math.random();
        const availIdx = rand < AVAIL_WEIGHTS[0] ? 0 : rand < AVAIL_WEIGHTS[0] + AVAIL_WEIGHTS[1] ? 1 : 2;

        employees50.push({
            organizationId: org._id,
            name: fullName,
            email: `${fullName.toLowerCase().replace(/ /g, '.')}@workmesh.com`,
            role,
            department: dept,
            accessRole: 'Employee',
            total_experience_years: exp,
            communication_score: Math.round((rnd(40, 100) / 10) * 10) / 10,
            teamwork_score: Math.round((rnd(40, 100) / 10) * 10) / 10,
            performance_rating: Math.round((rnd(40, 100) / 10) * 10) / 10,
            error_rate: rnd(0, 20),
            availability_status: AVAIL[availIdx],
            location: pick(['Bangalore', 'Mumbai', 'Hyderabad', 'Chennai', 'Delhi', 'Pune']),
        });
    }

    const createdEmps = await Employee.insertMany(employees50);
    console.log(`👥 ${createdEmps.length} employees created`);

    // ── 5. EmployeeSkills ────────────────────────────────────────────────────────
    const allEmployees = await Employee.find({ organizationId: org._id });
    const empSkillDocs = [];

    for (const emp of allEmployees) {
        const numSkills = rnd(2, 6);
        const mySkills = pickN(skillIds, numSkills);
        for (const skillId of mySkills) {
            empSkillDocs.push({
                emp_id: emp._id,
                skill_id: skillId,
                proficiency_level: rnd(1, 5),
                years_experience: rnd(0, emp.total_experience_years || 1),
                last_used_year: 2026,
            });
        }
    }

    // Use model if EmployeeSkill model exists, otherwise direct insert
    const EmployeeSkillModel = EmployeeSkill;
    await EmployeeSkillModel.insertMany(empSkillDocs);
    console.log(`🔗 ${empSkillDocs.length} employee-skill links created`);

    // ── 6. Projects ──────────────────────────────────────────────────────────────
    const projectDocs = [];
    for (let i = 0; i < 10; i++) {
        const projSkillNames = pickN(Object.keys(skillMap), rnd(3, 5));
        const requiredSkills = projSkillNames.map(name => ({
            skillId: skillMap[name].toString(),
            skillName: name,
            minimumExperience: rnd(0, 3),
            priority: Math.random() > 0.3 ? 'Must-have' : 'Nice-to-have',
            weight: rnd(30, 100),
        }));

        const start = new Date();
        start.setMonth(start.getMonth() - rnd(0, 6));
        const deadline = new Date(start);
        deadline.setMonth(deadline.getMonth() + rnd(3, 12));

        projectDocs.push({
            organizationId: org._id,
            name: PROJECT_NAMES[i],
            project_name: PROJECT_NAMES[i],
            client_name: pick(['TechCorp', 'FinBank', 'HealthPlus', 'RetailGiant', 'StartupX']),
            domain: pick(['FinTech', 'Healthcare', 'E-Commerce', 'SaaS', 'Mobile', 'AI/ML']),
            description: `${PROJECT_NAMES[i]} — a key initiative for the organization.`,
            start_date: start,
            end_date: deadline,
            deadline: deadline,
            project_budget: rnd(50000, 500000),
            priority_level: rnd(1, 5),
            status: pick(['Draft', 'Active', 'Active', 'Active', 'Completed']),
            requiredSkills,
            teamPreferences: {
                teamSize: rnd(3, 8),
                seniorityMix: { junior: rnd(20, 40), mid: rnd(30, 50), senior: rnd(10, 30) },
            },
        });
    }

    await Project.insertMany(projectDocs);
    console.log('📁 10 projects created');

    // ── 7. EmployeeProjectHistory ─────────────────────────────────────────────────
    const histDocs = [];
    const histEmps = pickN(allEmployees, 35);
    const projects = await Project.find({ organizationId: org._id });

    for (const emp of histEmps) {
        const proj = pick(projects);
        histDocs.push({
            emp_id: emp._id,
            project_id: proj._id,
            performance_feedback: Math.round(rnd(5, 10) * 10) / 10,
            contribution_notes: 'Good work during the project.',
        });
    }

    await EmployeeProjectHistory.insertMany(histDocs);
    console.log(`📊 ${histDocs.length} project history records created`);

    console.log('\n🎉 Seed complete!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  Admin login:   admin@workmesh.com');
    console.log('  Password:      Rajesh@2004');
    console.log('  Manager login: manager@workmesh.com');
    console.log('  Password:      Rajesh@2004');
    console.log('═══════════════════════════════════════════════');

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
