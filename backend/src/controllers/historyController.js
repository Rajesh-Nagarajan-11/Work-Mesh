const EmployeeProjectHistory = require('../models/EmployeeProjectHistory');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const { ok, fail } = require('../utils/apiResponse');

/**
 * GET /api/history - Get all history records in the org
 */
async function getAll(req, res) {
    const { organizationId } = req.user;

    const [employees, projects] = await Promise.all([
        Employee.find({ organizationId }).select('_id'),
        Project.find({ organizationId }).select('_id'),
    ]);

    const empIds = employees.map((e) => e._id);
    const projIds = projects.map((p) => p._id);

    const history = await EmployeeProjectHistory.find({
        emp_id: { $in: empIds },
        project_id: { $in: projIds },
    })
        .populate('emp_id', 'name email role department')
        .populate('project_id', 'name status priority domain client_name')
        .sort({ createdAt: -1 });

    return ok(res, history, 'History fetched');
}

/**
 * GET /api/history/employee/:empId - Get history for a specific employee
 */
async function getByEmployee(req, res) {
    const { organizationId } = req.user;
    const { empId } = req.params;

    const emp = await Employee.findOne({ _id: empId, organizationId });
    if (!emp) return fail(res, 404, 'Employee not found');

    const history = await EmployeeProjectHistory.find({ emp_id: empId })
        .populate('project_id', 'name status priority domain client_name deadline')
        .sort({ createdAt: -1 });

    return ok(res, history, 'Employee history fetched');
}

/**
 * GET /api/history/project/:projectId - Get history for a specific project
 */
async function getByProject(req, res) {
    const { organizationId } = req.user;
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId, organizationId });
    if (!project) return fail(res, 404, 'Project not found');

    const history = await EmployeeProjectHistory.find({ project_id: projectId })
        .populate('emp_id', 'name email role department')
        .sort({ createdAt: -1 });

    return ok(res, history, 'Project history fetched');
}

/**
 * POST /api/history - Create a new history record
 */
async function create(req, res) {
    const { organizationId } = req.user;
    const {
        emp_id,
        project_id,
        role_in_project,
        allocation_percentage,
        performance_feedback,
        domain_experience_year,
    } = req.body || {};

    if (!emp_id || !project_id) {
        return fail(res, 400, 'emp_id and project_id are required');
    }

    const [emp, project] = await Promise.all([
        Employee.findOne({ _id: emp_id, organizationId }),
        Project.findOne({ _id: project_id, organizationId }),
    ]);

    if (!emp) return fail(res, 404, 'Employee not found');
    if (!project) return fail(res, 404, 'Project not found');

    const record = await EmployeeProjectHistory.create({
        emp_id,
        project_id,
        role_in_project: role_in_project || 'Developer',
        allocation_percentage: allocation_percentage ?? 100,
        performance_feedback: performance_feedback ?? null,
        domain_experience_year: domain_experience_year ?? new Date().getFullYear(),
    });

    await record.populate([
        { path: 'emp_id', select: 'name email role' },
        { path: 'project_id', select: 'name status domain' },
    ]);

    return ok(res, record, 'History record created');
}

/**
 * PUT /api/history/:id  - Update a history record (e.g. add performance feedback)
 */
async function update(req, res) {
    const { organizationId } = req.user;
    const { id } = req.params;
    const updates = req.body || {};

    const record = await EmployeeProjectHistory.findById(id);
    if (!record) return fail(res, 404, 'History record not found');

    // Verify ownership via employee
    const emp = await Employee.findOne({ _id: record.emp_id, organizationId });
    if (!emp) return fail(res, 403, 'Forbidden');

    const allowed = [
        'role_in_project',
        'allocation_percentage',
        'performance_feedback',
        'domain_experience_year',
    ];
    allowed.forEach((field) => {
        if (updates[field] !== undefined) record[field] = updates[field];
    });

    await record.save();
    return ok(res, record, 'History record updated');
}

/**
 * DELETE /api/history/:id - Delete a history record
 */
async function remove(req, res) {
    const { organizationId } = req.user;
    const { id } = req.params;

    const record = await EmployeeProjectHistory.findById(id);
    if (!record) return fail(res, 404, 'History record not found');

    const emp = await Employee.findOne({ _id: record.emp_id, organizationId });
    if (!emp) return fail(res, 403, 'Forbidden');

    await record.deleteOne();
    return ok(res, { deleted: true }, 'History record deleted');
}

module.exports = { getAll, getByEmployee, getByProject, create, update, remove };
