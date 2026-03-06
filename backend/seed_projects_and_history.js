require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./src/models/Employee');
const Skill = require('./src/models/Skill');
const Project = require('./src/models/Project');
const EmployeeProjectHistory = require('./src/models/EmployeeProjectHistory');
const Allocation = require('./src/models/Allocation');
const Organization = require('./src/models/Organization');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/workmesh';

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getRandomItem(array) { return array[Math.floor(Math.random() * array.length)]; }

const projectNames = [
    'Cloud Migration Initiative', 'Mobile App Redesign', 'Enterprise Data Warehouse',
    'AI-Powered Chatbot', 'E-commerce Platform Phase 2', 'Cybersecurity Audit & Upgrade',
    'Legacy System Modernization', 'Customer Portal V3', 'Internal HR Tooling',
    'Payment Gateway Integration', 'IoT Fleet Management', 'Predictive Analytics Engine',
    'Serverless Microservices Refactor', 'Blockchain Identity V1', 'AR Marketing Campaign',
    'CRM Data Sync Service', 'Automated QA Testing Suite', 'Supply Chain Dashboard',
    'Fintech Mobile Wallet', 'Healthcare Records API'
];

const domains = ['Finance', 'Healthcare', 'Retail', 'Logistics', 'Marketing', 'Education', 'Government', 'Entertainment'];
const roles = ['Frontend Developer', 'Backend Developer', 'QA Tester', 'Project Manager', 'Data Engineer', 'UI/UX Designer', 'DevOps Specialist'];

async function run() {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB...');

    let org = await Organization.findOne();
    const orgId = org._id;

    // Fetch dependencies
    const allSkills = await Skill.find({ organizationId: orgId });
    const allEmployees = await Employee.find({ organizationId: orgId });

    if (allEmployees.length === 0) {
        console.error('No employees found! Please run seed_employees.js first.');
        process.exit(1);
    }

    console.log('Wiping old dummy projects and histories to ensure a clean slate...');
    await Project.deleteMany({ organizationId: orgId });
    await EmployeeProjectHistory.deleteMany({});
    await Allocation.deleteMany({});

    console.log('Generating 50 Projects...');
    const createdProjects = [];

    // We want a mix of Active, Completed, Archieved, Draft
    for (let i = 0; i < 50; i++) {
        const name = getRandomItem(projectNames) + ` - Alpha ${i}`;
        const domain = getRandomItem(domains);

        let status = 'Active';
        const rand = Math.random();
        if (rand < 0.2) status = 'Completed';
        else if (rand < 0.3) status = 'Archived';
        else if (rand < 0.4) status = 'Draft';

        // 3-6 skills required per project
        const reqSkills = [];
        const numSkills = getRandomInt(3, 6);
        for (let s = 0; s < numSkills; s++) {
            const sk = getRandomItem(allSkills);
            reqSkills.push({
                skillId: sk._id.toString(),
                skillName: sk.skill_name,
                minimumExperience: getRandomInt(1, 4),
                priority: Math.random() > 0.3 ? 'Must-have' : 'Nice-to-have',
                weight: getRandomInt(40, 100)
            });
        }

        const now = new Date();
        const start = new Date(now);
        start.setMonth(start.getMonth() - getRandomInt(0, 6));

        const end = new Date(start);
        end.setMonth(end.getMonth() + getRandomInt(3, 18)); // duration

        const proj = await Project.create({
            organizationId: orgId,
            project_name: name,
            name: name,
            client_name: 'Client ' + getRandomItem(['A', 'B', 'Inc', 'Corp', 'LLC']),
            domain,
            start_date: start,
            createdAt: start, // Override default timestamp to spread chart data
            end_date: status === 'Completed' ? end : null,
            deadline: end,
            project_budget: getRandomInt(50000, 500000),
            priority_level: getRandomInt(1, 5),
            status,
            priority: getRandomItem(['Low', 'Medium', 'High']),
            duration: getRandomInt(3, 18),
            progress: status === 'Completed' ? 100 : getRandomInt(10, 90),
            requiredSkills: reqSkills,
            createdBy: allEmployees[0]._id // just tag the first employee
        });
        createdProjects.push(proj);
    }

    console.log(`Generated 50 projects. Seeding History & Allocations...`);

    let historyCount = 0;
    let allocationCount = 0;

    // For every employee, assign them to some past projects and maybe 1 active project
    for (const emp of allEmployees) {

        // --- HISTORY ---
        // Each employee has 1 to 5 past completed projects
        const numPast = getRandomInt(1, 5);
        const completedProjs = createdProjects.filter(p => p.status === 'Completed' || p.status === 'Archived');

        for (let j = 0; j < numPast; j++) {
            const p = getRandomItem(completedProjs);
            if (!p) continue;

            await EmployeeProjectHistory.create({
                emp_id: emp._id,
                project_id: p._id,
                role_in_project: getRandomItem(roles),
                allocation_percentage: getRandomInt(50, 100),
                performance_feedback: getRandomInt(6, 10),
                domain_experience_year: new Date().getFullYear() - getRandomInt(0, 3)
            });
            historyCount++;
        }

        // --- ACTIVE ALLOCATIONS ---
        // 70% chance an employee is actively working on a project right now
        if (Math.random() < 0.7) {
            const activeProjs = createdProjects.filter(p => p.status === 'Active');
            if (activeProjs.length > 0) {
                const p = getRandomItem(activeProjs);
                const allocPct = getRandomInt(50, 100);

                await Allocation.create({
                    emp_id: emp._id,
                    project_id: p._id,
                    allocation_start_date: p.start_date,
                    allocation_percentage: allocPct
                });

                // Update employee current workload to match
                emp.availability = emp.availability || {};
                emp.availability.currentWorkload = allocPct;
                emp.availability.currentProject = p.name;
                emp.availability.status = allocPct >= 100 ? 'Unavailable' : 'Partially Available';
                emp.availability_status = emp.availability.status;
                await emp.save();

                allocationCount++;
            }
        } else {
            // Free
            emp.availability = emp.availability || {};
            emp.availability.currentWorkload = 0;
            emp.availability.currentProject = null;
            emp.availability.status = 'Available';
            emp.availability_status = 'Available';
            await emp.save();
        }
    }

    console.log(`\n\nDone! Successfully seeded:`);
    console.log(`- 50 Projects`);
    console.log(`- ${historyCount} Past Project Histories`);
    console.log(`- ${allocationCount} Active Allocations`);

    await mongoose.disconnect();
}

run().catch(console.error);
