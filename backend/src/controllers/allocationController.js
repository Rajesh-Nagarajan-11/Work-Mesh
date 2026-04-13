const Allocation = require('../models/Allocation');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Organization = require('../models/Organization');
const { ok, fail } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/mailer');

function formatDateForEmail(value) {
    if (!value) return 'Not specified';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Not specified';
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
}

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

    if (emp.email) {
        try {
            const org = await Organization.findById(organizationId).select('companyName');
            const companyName = org?.companyName || 'Work Mesh';
            const startDate = formatDateForEmail(allocation_start_date);
            const endDate = allocation_end_date ? formatDateForEmail(allocation_end_date) : 'Open-ended';
            const allocationPct = allocation_percentage ?? 100;
            const projectName = project.name || 'your assigned project';

            await sendEmail({
                to: emp.email,
                subject: `You have been selected for the team: ${projectName}`,
                html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Selection - ${companyName}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">You are selected</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.92);">Project team assignment notice</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hello ${emp.name},</p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #64748b;">You have been selected for the project team in ${companyName}. Here are your assignment details:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 10px 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Project</td>
                  <td style="padding: 10px 12px; font-size: 14px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Allocation</td>
                  <td style="padding: 10px 12px; font-size: 14px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${allocationPct}%</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Start date</td>
                  <td style="padding: 10px 12px; font-size: 14px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${startDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-size: 13px; color: #64748b;">End date</td>
                  <td style="padding: 10px 12px; font-size: 14px; color: #0f172a; font-weight: 600;">${endDate}</td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #64748b;">Please contact your project manager if you have any scheduling concerns.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">— Work Mesh</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
                `,
                text: `Hello ${emp.name},\n\nYou have been selected for the project team in ${companyName}.\n\nProject: ${projectName}\nAllocation: ${allocationPct}%\nStart date: ${startDate}\nEnd date: ${endDate}\n\nPlease contact your project manager if you have any scheduling concerns.\n\n— Work Mesh`,
            });
        } catch (emailErr) {
            console.error(`[allocationController] Team selection email failed for employee ${emp._id}:`, emailErr.message);
        }
    }

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
