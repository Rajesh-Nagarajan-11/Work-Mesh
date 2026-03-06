require('dotenv').config();
const mongoose = require('mongoose');

const Organization = require('./src/models/Organization');
const Skill = require('./src/models/Skill');
const Project = require('./src/models/Project');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workmesh';

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    const org = await Organization.findOne({ companyName: 'Work Mesh Corp' });
    if (!org) {
        console.error('Organization not found. Have you run seed.js?');
        process.exit(1);
    }

    const mernAiSkillNames = ['MongoDB', 'React', 'Node.js', 'Machine Learning'];
    const skills = await Skill.find({ organizationId: org._id, skill_name: { $in: mernAiSkillNames } });

    // Fallback if some skills aren't found in DB
    const requiredSkills = skills.map(s => ({
        skillId: s._id.toString(),
        skillName: s.skill_name,
        minimumExperience: 2,
        priority: 'Must-have',
        weight: 80,
    }));

    if (requiredSkills.length === 0) {
        console.warn('⚠️ No matching MERN/AI skills found in DB, requiredSkills will be empty.');
    }

    const start = new Date();
    const deadline = new Date(start);
    deadline.setMonth(deadline.getMonth() + 4);

    const project = await Project.create({
        organizationId: org._id,
        name: 'MERN + AI Project',
        project_name: 'MERN + AI Project',
        client_name: 'AI Innovations',
        domain: 'AI/ML',
        description: 'A cutting-edge MERN stack application with integrated Machine Learning models for advanced analytics.',
        start_date: start,
        end_date: deadline,
        deadline: deadline,
        project_budget: 120000,
        priority_level: 4,
        status: 'Draft',
        requiredSkills,
        teamPreferences: {
            teamSize: 0,
            seniorityMix: { junior: 0, mid: 0, senior: 0 },
        },
    });

    console.log('✅ Successfully seeded MERN + AI Project as Draft:', project.name);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
