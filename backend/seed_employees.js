require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./src/models/Employee');
const Skill = require('./src/models/Skill');
const EmployeeSkill = require('./src/models/EmployeeSkill');
const Organization = require('./src/models/Organization');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/workmesh';

const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'James', 'Ava', 'William', 'Sophia', 'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Evelyn', 'Theodore', 'Harper', 'Jack', 'Luna', 'Levi', 'Camila', 'Alexander', 'Gianna', 'Jackson', 'Elizabeth', 'Mateo', 'Eleanor', 'Daniel', 'Ella', 'Michael', 'Abigail', 'Mason', 'Sofia', 'Sebastian', 'Avery', 'Ethan', 'Scarlett', 'Logan', 'Emily', 'Owen', 'Aria', 'Samuel', 'Penelope', 'Jacob', 'Chloe', 'Asher', 'Layla', 'Rajesh', 'Priya', 'Amit', 'Neha', 'Vikram', 'Anjali', 'Arjun', 'Sneha', 'Rahul', 'Pooja', 'Wei', 'Li', 'Jian', 'Min', 'Chen', 'Fang', 'Hiroto', 'Yui', 'Kenji', 'Sakura', 'Mateusz', 'Anna', 'Ivan', 'Maria', 'Sven', 'Astrid', 'Omar', 'Fatima', 'Tariq', 'Aisha', 'Diego', 'Carmen', 'Santiago', 'Valentina', 'Carlos', 'Camila', 'Luca', 'Giulia', 'Marco', 'Sofia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Sharma', 'Patel', 'Singh', 'Deshmuck', 'Iyer', 'Menon', 'Kumar', 'Das', 'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Takahashi', 'Suzuki', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Smirnov', 'Ivanov', 'Kuznetsov', 'Sokolov', 'Popov', 'Novikov', 'Morozov', 'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen'];

const roles = [
    { title: 'Frontend Developer', categories: ['Frontend Development', 'Programming Languages', 'UI/UX Design & Architecture'] },
    { title: 'Backend Developer', categories: ['Backend Development', 'Database Management', 'Programming Languages', 'DevOps & Cloud Infrastructure'] },
    { title: 'Full Stack Developer', categories: ['Frontend Development', 'Backend Development', 'Database Management', 'Programming Languages'] },
    { title: 'Data Scientist', categories: ['Data Science & Machine Learning', 'Programming Languages', 'Database Management'] },
    { title: 'DevOps Engineer', categories: ['DevOps & Cloud Infrastructure', 'Programming Languages', 'Backend Development', 'Cybersecurity & Networking'] },
    { title: 'Mobile Developer', categories: ['Mobile Development', 'Frontend Development', 'Programming Languages'] },
    { title: 'QA Engineer', categories: ['Software Testing & QA', 'Programming Languages'] },
    { title: 'Security Specialist', categories: ['Cybersecurity & Networking', 'Programming Languages', 'DevOps & Cloud Infrastructure'] },
    { title: 'UI/UX Designer', categories: ['UI/UX Design & Architecture', 'Frontend Development'] }
];

const departments = ['Engineering', 'Data', 'Product', 'Design', 'Security', 'QA'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 1) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

async function run() {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB...');

    let org = await Organization.findOne();
    if (!org) {
        org = await Organization.create({ companyName: 'Work Mesh Corp', location: 'San Francisco, CA' });
    }
    const orgId = org._id;

    // Fetch all skills
    const allSkills = await Skill.find({ organizationId: orgId });
    if (allSkills.length === 0) {
        console.error('No skills found. Please run seed_skills.js first.');
        process.exit(1);
    }

    // Group skills by category for easy selection
    const skillsByCategory = {};
    for (const skill of allSkills) {
        if (!skillsByCategory[skill.skill_category]) {
            skillsByCategory[skill.skill_category] = [];
        }
        skillsByCategory[skill.skill_category].push(skill);
    }
    const allCategories = Object.keys(skillsByCategory);

    console.log(`Generating 200 random employees with rich skill sets...`);

    let addedEmployees = 0;
    let addedSkills = 0;

    for (let i = 0; i < 200; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const name = `${firstName} ${lastName}`;
        // Create unique email
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@workmesh.example.com`;

        const roleDef = getRandomItem(roles);
        const role = roleDef.title;
        const department = getRandomItem(departments);
        const experience = getRandomInt(1, 15);

        // Random performance metrics
        const performance = getRandomFloat(6.0, 9.9);
        const teamwork = getRandomFloat(6.0, 9.9);
        const communication = getRandomFloat(6.5, 9.9);
        const errorRate = getRandomInt(0, 30);

        // Availability
        const statusDraw = Math.random();
        let availability_status = 'Available';
        let workload = 0;
        let currentProj = null;

        if (statusDraw < 0.3) {
            availability_status = 'Unavailable';
            workload = 100;
            currentProj = 'Active Client Project';
        } else if (statusDraw < 0.6) {
            availability_status = 'Partially Available';
            workload = getRandomItem([30, 40, 50, 60, 70]);
            currentProj = 'Internal Tools';
        }

        // 1. Create Employee
        const emp = await Employee.create({
            organizationId: orgId,
            name,
            email,
            phone: `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`,
            department,
            role,
            total_experience_years: experience,
            experience: experience, // legacy
            performance_rating: performance,
            teamwork_score: teamwork,
            communication_score: communication,
            error_rate: errorRate,
            availability_status,
            pastProjectScore: Math.floor(performance * 10), // legacy scale 0-100
            location: getRandomItem(['New York', 'London', 'Remote', 'San Francisco', 'Berlin', 'Tokyo', 'Bangalore']),
            availability: {
                status: availability_status,
                currentProject: currentProj,
                currentWorkload: workload
            }
        });

        addedEmployees++;

        // 2. Assign Skills
        const numSkills = getRandomInt(6, 18);
        const chosenSkillIds = new Set();

        for (let s = 0; s < numSkills; s++) {
            // Pick a category. 80% chance it's from their role's preferred categories, 20% random category
            let poolCategories;
            if (Math.random() < 0.8 && roleDef.categories.length > 0) {
                poolCategories = roleDef.categories;
            } else {
                poolCategories = allCategories;
            }

            const cat = getRandomItem(poolCategories);
            const skillsInCat = skillsByCategory[cat] || [];

            if (skillsInCat.length > 0) {
                const skill = getRandomItem(skillsInCat);
                if (!chosenSkillIds.has(skill._id.toString())) {
                    chosenSkillIds.add(skill._id.toString());

                    // Assign proficiency and mapped experience realistically
                    let prof = getRandomInt(1, 4);
                    // If they have high overall experience, chance for expert
                    if (experience >= 5 && Math.random() < 0.3) prof = 5;

                    let skillExp = getRandomInt(1, experience);

                    await EmployeeSkill.create({
                        emp_id: emp._id,
                        skill_id: skill._id,
                        proficiency_level: prof,
                        years_experience: skillExp,
                        last_used_year: new Date().getFullYear() - getRandomInt(0, 3)
                    });

                    addedSkills++;
                }
            }
        }

        if (i % 20 === 0) process.stdout.write(`\nSeeded ${i}/200 employees...`);
    }

    console.log(`\n\nDone! Successfully seeded:`);
    console.log(`- ${addedEmployees} Employees`);
    console.log(`- ${addedSkills} Skill Mappings`);

    await mongoose.disconnect();
}

run().catch(console.error);
