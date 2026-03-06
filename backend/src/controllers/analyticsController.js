const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Allocation = require('../models/Allocation');
const EmployeeProjectHistory = require('../models/EmployeeProjectHistory');
const EmployeeSkill = require('../models/EmployeeSkill');
const Skill = require('../models/Skill');
const { ok } = require('../utils/apiResponse');

/**
 * GET /api/analytics - Returns real dashboard KPIs and chart data
 */
async function getAnalytics(req, res) {
    const { organizationId } = req.user;
    const now = new Date();

    // Fetch core counts
    const [
        totalEmployees,
        employees,
        projects,
        activeProjects,
        completedProjects,
    ] = await Promise.all([
        Employee.countDocuments({ organizationId }),
        Employee.find({ organizationId }).select('availability_status performance_rating'),
        Project.find({ organizationId }).select('status deadline createdAt priority_level'),
        Project.countDocuments({ organizationId, status: 'Active' }),
        Project.countDocuments({ organizationId, status: 'Completed' }),
    ]);

    // Active allocations
    const [empIds, projIds] = [
        employees.map((e) => e._id),
        projects.map((p) => p._id),
    ];

    const [activeAllocations, historyRecords, skillCounts] = await Promise.all([
        Allocation.countDocuments({
            emp_id: { $in: empIds },
            project_id: { $in: projIds },
            $or: [
                { allocation_end_date: null },
                { allocation_end_date: { $gte: now } },
            ],
        }),
        EmployeeProjectHistory.find({
            emp_id: { $in: empIds },
            project_id: { $in: projIds },
            performance_feedback: { $ne: null },
        }).select('performance_feedback'),
        EmployeeSkill.aggregate([
            { $match: { emp_id: { $in: empIds } } },
            { $group: { _id: '$skill_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            {
                $lookup: {
                    from: 'skills',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'skill',
                },
            },
            { $unwind: { path: '$skill', preserveNullAndEmptyArrays: true } },
        ]),
    ]);

    // Average performance rating
    const avgPerformance =
        historyRecords.length > 0
            ? historyRecords.reduce((sum, r) => sum + r.performance_feedback, 0) / historyRecords.length
            : 0;

    // Availability breakdown
    const availableCount = employees.filter((e) => e.availability_status === 'Available').length;
    const utilization =
        totalEmployees > 0
            ? Math.round(((totalEmployees - availableCount) / totalEmployees) * 100)
            : 0;

    // KPIs
    const kpis = [
        {
            label: 'Total Employees',
            value: totalEmployees,
            change: 0,
            trend: 'neutral',
            icon: 'Users',
        },
        {
            label: 'Active Projects',
            value: activeProjects,
            change: 0,
            trend: 'neutral',
            icon: 'Briefcase',
        },
        {
            label: 'Active Allocations',
            value: activeAllocations,
            change: 0,
            trend: 'neutral',
            icon: 'CheckCircle',
        },
        {
            label: 'Team Utilization',
            value: utilization,
            change: 0,
            trend: 'neutral',
            icon: 'TrendingUp',
        },
    ];

    // Projects split by month (last 6 months)
    const projectsOverTime = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const count = projects.filter((p) => {
            const created = new Date(p.createdAt);
            return created >= d && created <= monthEnd;
        }).length;
        projectsOverTime.push({
            label: d.toLocaleString('default', { month: 'short' }),
            value: count,
        });
    }

    // Upcoming deadlines (active projects due in the next 30 days)
    const upcomingDeadlines = projects
        .filter((p) => {
            if (p.status !== 'Active') return false;
            if (!p.deadline) return false;
            const daysLeft = Math.ceil((new Date(p.deadline) - now) / 86400000);
            return daysLeft >= 0 && daysLeft <= 30;
        })
        .map((p) => {
            const daysLeft = Math.ceil((new Date(p.deadline) - now) / 86400000);
            return {
                id: p._id.toString(),
                projectName: p.name || 'Untitled',
                dueDate: new Date(p.deadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                }),
                daysRemaining: daysLeft,
                status: daysLeft <= 2 ? 'critical' : daysLeft <= 7 ? 'warning' : 'upcoming',
            };
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Skill demand from employee_skills
    const skillDemand = skillCounts.map((s) => ({
        label: s.skill ? s.skill.skill_name : 'Unknown',
        value: s.count,
    }));

    // Department allocation
    const deptMap = {};
    employees.forEach((e) => {
        // We need department — fetch from full employee
    });

    return ok(
        res,
        {
            kpis,
            projectsOverTime,
            skillDemand,
            upcomingDeadlines,
            summary: {
                totalEmployees,
                activeProjects,
                completedProjects,
                activeAllocations,
                avgPerformance: Math.round(avgPerformance * 10) / 10,
                utilization,
            },
        },
        'Analytics fetched'
    );
}

module.exports = { getAnalytics };
