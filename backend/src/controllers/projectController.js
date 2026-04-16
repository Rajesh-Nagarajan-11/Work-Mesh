const Project = require('../models/Project');
const Allocation = require('../models/Allocation');
const Employee = require('../models/Employee');
const EmployeeProjectHistory = require('../models/EmployeeProjectHistory');
const { ok, fail } = require('../utils/apiResponse');

const normalizeFeedbackScore = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 10) return null;
  return rounded;
};

async function getAll(req, res) {
  const { organizationId } = req.user;
  const projects = await Project.find({ organizationId }).sort({ createdAt: -1 });
  return ok(res, projects, 'Projects fetched');
}

async function getById(req, res) {
  const { organizationId } = req.user;
  const { id } = req.params;
  const project = await Project.findOne({ _id: id, organizationId });
  if (!project) return fail(res, 404, 'Project not found');
  return ok(res, project, 'Project fetched');
}

async function create(req, res) {
  const { organizationId, id: userId } = req.user;
  const {
    name,
    client_name,
    client_email,
    domain,
    description,
    status,
    priority,
    deadline,
    duration,
    progress,
    requiredSkills,
    teamPreferences,
    source,
  } = req.body || {};

  if (!name || !deadline) {
    return fail(res, 400, 'name and deadline are required');
  }

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return fail(res, 400, 'Invalid deadline date');
  }

  const normalizedClientEmail = client_email ? String(client_email).toLowerCase().trim() : null;
  if (normalizedClientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedClientEmail)) {
    return fail(res, 400, 'Invalid client email');
  }

  const project = await Project.create({
    organizationId,
    name: String(name).trim(),
    project_name: String(name).trim(),
    client_name: client_name ? String(client_name).trim() : null,
    client_email: normalizedClientEmail,
    domain: domain ? String(domain).trim() : null,
    description: description ? String(description).trim() : '',
    status: status || 'Draft',
    priority: priority || 'Medium',
    deadline: deadlineDate,
    duration: duration || 1,
    progress: progress ?? 0,
    requiredSkills: requiredSkills || [],
    teamPreferences: teamPreferences || { teamSize: 5, seniorityMix: { junior: 40, mid: 40, senior: 20 } },
    createdBy: userId,
    source: source || 'manual',
  });

  return ok(res, project, 'Project created');
}

async function update(req, res) {
  const { organizationId } = req.user;
  const { id } = req.params;
  const updates = req.body || {};

  const project = await Project.findOne({ _id: id, organizationId });
  if (!project) return fail(res, 404, 'Project not found');

  const prevStatus = project.status;
  const completionFeedback = updates.completionFeedback;
  const isCompleting = prevStatus !== 'Completed' && updates.status === 'Completed';

  let completionAllocations = [];
  let feedbackByEmployee = {};

  delete updates.organizationId;
  delete updates._id;
  delete updates.id;
  delete updates.completionFeedback;

  if (updates.deadline) {
    const d = new Date(updates.deadline);
    updates.deadline = Number.isNaN(d.getTime()) ? project.deadline : d;
  }

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim();
    updates.project_name = updates.name;
  }

  if (updates.client_name !== undefined) {
    updates.client_name = updates.client_name ? String(updates.client_name).trim() : null;
  }

  if (updates.client_email !== undefined) {
    const normalizedClientEmail = updates.client_email ? String(updates.client_email).toLowerCase().trim() : null;
    if (normalizedClientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedClientEmail)) {
      return fail(res, 400, 'Invalid client email');
    }
    updates.client_email = normalizedClientEmail;
  }

  if (updates.domain !== undefined) {
    updates.domain = updates.domain ? String(updates.domain).trim() : null;
  }

  if (isCompleting) {
    completionAllocations = await Allocation.find({ project_id: project._id });

    if (completionAllocations.length > 0) {
      feedbackByEmployee =
        completionFeedback && typeof completionFeedback.byEmployee === 'object'
          ? completionFeedback.byEmployee
          : {};

      const missingFeedback = completionAllocations.filter((alloc) => {
        const score = normalizeFeedbackScore(feedbackByEmployee[alloc.emp_id.toString()]);
        return score === null;
      });

      if (missingFeedback.length > 0) {
        return fail(
          res,
          400,
          'Completion feedback is required for each allocated employee (score 1-10)'
        );
      }
    }
  }

  Object.assign(project, updates);
  await project.save();

  if (prevStatus !== 'Completed' && project.status === 'Completed') {
    const allocations = completionAllocations.length > 0
      ? completionAllocations
      : await Allocation.find({ project_id: project._id });

    if (allocations.length > 0) {
      const empIds = allocations.map((a) => a.emp_id);
      const employees = await Employee.find({ _id: { $in: empIds }, organizationId }).select('role performance_rating');
      const employeeById = new Map(employees.map((e) => [e._id.toString(), e]));

      const resolvedFeedbackByEmployee =
        completionFeedback && typeof completionFeedback.byEmployee === 'object'
          ? completionFeedback.byEmployee
          : feedbackByEmployee;
      const defaultFeedback = normalizeFeedbackScore(completionFeedback?.defaultScore);

      await Promise.all(
        allocations.map((alloc) => {
          const empId = alloc.emp_id.toString();
          const emp = employeeById.get(empId);
          const role = emp?.role || 'Developer';
          const scoreFromMap = normalizeFeedbackScore(resolvedFeedbackByEmployee[empId]);
          const fallbackScore = normalizeFeedbackScore(emp?.performance_rating);
          const feedbackScore = scoreFromMap ?? defaultFeedback ?? fallbackScore;

          const setPayload = {
            role_in_project: role,
            allocation_percentage: alloc.allocation_percentage ?? 100,
            domain_experience_year: new Date().getFullYear(),
          };

          if (feedbackScore !== null) {
            setPayload.performance_feedback = feedbackScore;
          }

          return EmployeeProjectHistory.updateOne(
            { emp_id: alloc.emp_id, project_id: project._id },
            { $set: setPayload },
            { upsert: true }
          );
        })
      );
    }
  }

  return ok(res, project, 'Project updated');
}

async function remove(req, res) {
  const { organizationId } = req.user;
  const { id } = req.params;
  const project = await Project.findOneAndDelete({ _id: id, organizationId });
  if (!project) return fail(res, 404, 'Project not found');
  return ok(res, { deleted: true }, 'Project deleted');
}

module.exports = { getAll, getById, create, update, remove };
