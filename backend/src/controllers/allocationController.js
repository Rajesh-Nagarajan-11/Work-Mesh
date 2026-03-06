const Allocation = require('../models/Allocation');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const { ok, fail } = require('../utils/apiResponse');

/**
 * GET /api/allocations - Get all allocations in the org
 */
async function getAll(req, res) {
    const { organizationId } = req.user;

    // Fetch employees and projects belonging to this org for cross-collection lookup
    const [employees, projects] = await Promise.all([
        Employee.find({ organizationId }).select('_id'),
        Project.find({ organizationId }).select('_id'),
    ]);

    const empIds = employees.map((e) => e._id);
    const projIds = projects.map((p) => p._id);

    const allocations = await Allocation.find({
        emp_id: { $in: empIds },
        project_id: { $in: projIds },
    })
        .populate('emp_id', 'name email role department availability_status')
        .populate('project_id', 'name status priority deadline client_name domain')
        .sort({ allocation_start_date: -1 });

    return ok(res, allocations, 'Allocations fetched');
}

/**
 * GET /api/allocations/employee/:empId - Get allocations for a specific employee
 */
async function getByEmployee(req, res) {
    const { organizationId } = req.user;
    const { empId } = req.params;

    const emp = await Employee.findOne({ _id: empId, organizationId });
    if (!emp) return fail(res, 404, 'Employee not found');

    const allocations = await Allocation.find({ emp_id: empId })
        .populate('project_id', 'name status priority deadline client_name domain')
        .sort({ allocation_start_date: -1 });

    return ok(res, allocations, 'Employee allocations fetched');
}

/**
 * GET /api/allocations/project/:projectId - Get allocations for a specific project
 */
async function getByProject(req, res) {
    const { organizationId } = req.user;
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId, organizationId });
    if (!project) return fail(res, 404, 'Project not found');

    const allocations = await Allocation.find({ project_id: projectId })
        .populate('emp_id', 'name email role department availability_status')
        .sort({ allocation_start_date: -1 });

    return ok(res, allocations, 'Project allocations fetched');
}

/**
 * POST /api/allocations - Create a new allocation
 */
async function create(req, res) {
    const { organizationId } = req.user;
    const { emp_id, project_id, allocation_start_date, allocation_end_date, allocation_percentage } =
        req.body || {};

    if (!emp_id || !project_id || !allocation_start_date) {
        return fail(res, 400, 'emp_id, project_id and allocation_start_date are required');
    }

    // Verify employee and project belong to org
    const [emp, project] = await Promise.all([
        Employee.findOne({ _id: emp_id, organizationId }),
        Project.findOne({ _id: project_id, organizationId }),
    ]);

    if (!emp) return fail(res, 404, 'Employee not found');
    if (!project) return fail(res, 404, 'Project not found');

    const allocation = await Allocation.create({
        emp_id,
        project_id,
        allocation_start_date: new Date(allocation_start_date),
        allocation_end_date: allocation_end_date ? new Date(allocation_end_date) : null,
        allocation_percentage: allocation_percentage ?? 100,
    });

    // Update employee availability_status if 100% allocated
    if ((allocation_percentage ?? 100) >= 100) {
        await Employee.findByIdAndUpdate(emp_id, { availability_status: 'Unavailable' });
    } else {
        await Employee.findByIdAndUpdate(emp_id, { availability_status: 'Partially Available' });
    }

    await allocation.populate([
        { path: 'emp_id', select: 'name email role department' },
        { path: 'project_id', select: 'name status priority deadline' },
    ]);

    return ok(res, allocation, 'Allocation created');
}

/**
 * PUT /api/allocations/:id - Update an allocation
 */
async function update(req, res) {
    const { organizationId } = req.user;
    const { id } = req.params;
    const updates = req.body || {};

    // Verify the allocation belongs to this org by checking emp/project
    const allocation = await Allocation.findById(id);
    if (!allocation) return fail(res, 404, 'Allocation not found');

    const emp = await Employee.findOne({ _id: allocation.emp_id, organizationId });
    if (!emp) return fail(res, 403, 'Forbidden');

    if (updates.allocation_start_date)
        allocation.allocation_start_date = new Date(updates.allocation_start_date);
    if (updates.allocation_end_date !== undefined)
        allocation.allocation_end_date = updates.allocation_end_date
            ? new Date(updates.allocation_end_date)
            : null;
    if (updates.allocation_percentage !== undefined)
        allocation.allocation_percentage = updates.allocation_percentage;

    await allocation.save();

    // If end date is in the past, mark employee available
    if (allocation.allocation_end_date && allocation.allocation_end_date <= new Date()) {
        await Employee.findByIdAndUpdate(allocation.emp_id, { availability_status: 'Available' });
    }

    return ok(res, allocation, 'Allocation updated');
}

/**
 * DELETE /api/allocations/:id - Delete an allocation
 */
async function remove(req, res) {
    const { organizationId } = req.user;
    const { id } = req.params;

    const allocation = await Allocation.findById(id);
    if (!allocation) return fail(res, 404, 'Allocation not found');

    const emp = await Employee.findOne({ _id: allocation.emp_id, organizationId });
    if (!emp) return fail(res, 403, 'Forbidden');

    await allocation.deleteOne();

    // Check if employee has any remaining active allocations
    const remainingAllocations = await Allocation.countDocuments({
        emp_id: allocation.emp_id,
        $or: [
            { allocation_end_date: null },
            { allocation_end_date: { $gte: new Date() } },
        ],
    });

    if (remainingAllocations === 0) {
        await Employee.findByIdAndUpdate(allocation.emp_id, { availability_status: 'Available' });
    }

    return ok(res, { deleted: true }, 'Allocation deleted');
}

module.exports = { getAll, getByEmployee, getByProject, create, update, remove };
