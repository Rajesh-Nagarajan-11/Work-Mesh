const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const { ok, fail } = require('../utils/apiResponse');

/**
 * Get all employees in the organization
 * GET /api/employees
 */
async function getAll(req, res) {
  const { organizationId } = req.user;

  const employees = await Employee.find({ organizationId }).sort({ createdAt: -1 });

  return ok(res, employees, 'Employees fetched');
}

/**
 * Get single employee by ID
 * GET /api/employees/:id
 */
async function getById(req, res) {
  const { organizationId } = req.user;
  const { id } = req.params;

  const employee = await Employee.findOne({ _id: id, organizationId });

  if (!employee) {
    return fail(res, 404, 'Employee not found');
  }

  return ok(res, employee, 'Employee fetched');
}

/**
 * Create a new employee
 * POST /api/employees
 */
async function create(req, res) {
  const { organizationId } = req.user;
  const {
    name,
    email,
    phone,
    department,
    role,
    accessRole,
    password,
    skills,
    availability,
    experience,
    pastProjectScore,
    photoUrl,
  } = req.body || {};

  // Validation
  if (!name || !email) {
    return fail(res, 400, 'name and email are required');
  }

  // Check if email already exists in this org
  const existing = await Employee.findOne({
    organizationId,
    email: String(email).toLowerCase().trim(),
  });
  if (existing) {
    return fail(res, 409, 'An employee with this email already exists');
  }

  // Hash password if provided (for employees who can login)
  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(String(password), 10);
  }

  const employee = await Employee.create({
    organizationId,
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone ? String(phone).trim() : null,
    department: department ? String(department).trim() : 'General',
    role: role ? String(role).trim() : 'Employee',
    accessRole: accessRole || 'Employee',
    passwordHash,
    skills: skills || [],
    availability: availability || {
      status: 'Available',
      currentProject: null,
      currentWorkload: 0,
      availableFrom: null,
    },
    experience: experience || 0,
    pastProjectScore: pastProjectScore || null,
    photoUrl: photoUrl || null,
  });

  return ok(res, employee, 'Employee created');
}

/**
 * Update an employee
 * PUT /api/employees/:id
 */
async function update(req, res) {
  const { organizationId, id: currentUserId, accessRole: currentAccessRole } = req.user;
  const { id } = req.params;
  const updates = req.body || {};

  const employee = await Employee.findOne({ _id: id, organizationId });

  if (!employee) {
    return fail(res, 404, 'Employee not found');
  }

  // Only Admin can change accessRole
  if (updates.accessRole && currentAccessRole !== 'Admin') {
    delete updates.accessRole;
  }

  // Prevent non-admins from editing other employees (except themselves)
  if (currentAccessRole !== 'Admin' && currentAccessRole !== 'Manager' && id !== currentUserId) {
    return fail(res, 403, 'You can only edit your own profile');
  }

  // Handle password update
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(String(updates.password), 10);
    delete updates.password;
  }

  // Prevent changing organizationId
  delete updates.organizationId;
  delete updates._id;
  delete updates.id;

  // Update email to lowercase
  if (updates.email) {
    updates.email = String(updates.email).toLowerCase().trim();

    // Check if new email conflicts with another employee
    const existing = await Employee.findOne({
      organizationId,
      email: updates.email,
      _id: { $ne: id },
    });
    if (existing) {
      return fail(res, 409, 'An employee with this email already exists');
    }
  }

  Object.assign(employee, updates);
  await employee.save();

  return ok(res, employee, 'Employee updated');
}

/**
 * Delete an employee
 * DELETE /api/employees/:id
 */
async function remove(req, res) {
  const { organizationId, id: currentUserId } = req.user;
  const { id } = req.params;

  // Prevent deleting yourself
  if (id === currentUserId) {
    return fail(res, 400, 'You cannot delete yourself');
  }

  const employee = await Employee.findOneAndDelete({ _id: id, organizationId });

  if (!employee) {
    return fail(res, 404, 'Employee not found');
  }

  return ok(res, { deleted: true }, 'Employee deleted');
}

/**
 * Get an employee's project history
 * GET /api/employees/:id/history
 */
async function getEmployeeHistory(req, res) {
  const { organizationId } = req.user;
  const { id } = req.params;

  // First verify the employee exists and belongs to the org
  const employee = await Employee.findOne({ _id: id, organizationId });
  if (!employee) {
    return fail(res, 404, 'Employee not found');
  }

  // Find history records associated with this employee
  const EmployeeProjectHistory = require('../models/EmployeeProjectHistory');
  const history = await EmployeeProjectHistory.find({ emp_id: id })
    .populate('project_id', 'name status requiredSkills') // Get project details + skills
    .sort({ createdAt: -1 });

  return ok(res, history, 'Employee history fetched');
}

module.exports = { getAll, getById, create, update, remove, getEmployeeHistory };
