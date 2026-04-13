const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const EmployeeSkill = require('../models/EmployeeSkill');
const { ok, fail } = require('../utils/apiResponse');

const getProficiencyString = (level) => {
  if (level >= 5) return 'Expert';
  if (level >= 4) return 'Advanced';
  if (level >= 3) return 'Intermediate';
  return 'Beginner';
};

const getProficiencyNumber = (str) => {
  if (str === 'Expert') return 5;
  if (str === 'Advanced') return 4;
  if (str === 'Intermediate') return 3;
  return 1;
};

/**
 * Get all employees in the organization
 * GET /api/employees
 */
async function getAll(req, res) {
  const { organizationId } = req.user;
  const Allocation = require('../models/Allocation');
  const Project = require('../models/Project');

  // Fetch all employees
  const employees = await Employee.find({ organizationId }).sort({ createdAt: -1 });

  // For each employee, fetch their current allocation (if any)
  const employeeData = await Promise.all(
    employees.map(async (emp) => {
      // Find active allocation (no end date or end date in future)
      const allocation = await Allocation.findOne({
        emp_id: emp._id,
        $or: [
          { allocation_end_date: null },
          { allocation_end_date: { $gt: new Date() } },
        ],
      })
        .sort({ allocation_start_date: -1 })
        .populate('project_id', 'name');

      let availability = {
        status: emp.availability_status || 'Available',
        currentProject: null,
        currentWorkload: 0,
        availableFrom: null,
      };

      if (allocation && allocation.project_id) {
        availability.currentProject = allocation.project_id.name;
        availability.status = 'Unavailable';
      }

      // Fetch skills
      const employeeSkills = await EmployeeSkill.find({ emp_id: emp._id }).populate('skill_id', 'skill_name');
      const mappedSkills = employeeSkills
        .filter(es => es.skill_id) // ensure skill still exists
        .map(es => ({
          id: es._id.toHexString(),
          skillId: es.skill_id._id.toHexString(),
          skillName: es.skill_id.skill_name,
          yearsOfExperience: es.years_experience,
          proficiencyLevel: getProficiencyString(es.proficiency_level),
        }));

      // Attach availability to employee object (frontend expects this)
      return {
        ...emp.toJSON(),
        availability,
        skills: mappedSkills,
      };
    })
  );

  return ok(res, employeeData, 'Employees fetched');
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

  const employeeSkills = await EmployeeSkill.find({ emp_id: employee._id }).populate('skill_id', 'skill_name');
  const mappedSkills = employeeSkills
    .filter(es => es.skill_id)
    .map(es => ({
      id: es._id.toHexString(),
      skillId: es.skill_id._id.toHexString(),
      skillName: es.skill_id.skill_name,
      yearsOfExperience: es.years_experience,
      proficiencyLevel: getProficiencyString(es.proficiency_level),
    }));

  return ok(res, { ...employee.toJSON(), skills: mappedSkills }, 'Employee fetched');
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
    total_experience_years,
    communication_score,
    teamwork_score,
    performance_rating,
    error_rate,
    availability_status,
    location,
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
    availability_status: availability_status || availability?.status || 'Available',
    total_experience_years:
      total_experience_years !== undefined && total_experience_years !== null
        ? Number(total_experience_years)
        : experience !== undefined && experience !== null
          ? Number(experience)
          : 0,
    communication_score: communication_score !== undefined && communication_score !== null ? Number(communication_score) : null,
    teamwork_score: teamwork_score !== undefined && teamwork_score !== null ? Number(teamwork_score) : null,
    performance_rating: performance_rating !== undefined && performance_rating !== null ? Number(performance_rating) : null,
    error_rate: error_rate !== undefined && error_rate !== null ? Number(error_rate) : null,
    location: location ? String(location).trim() : null,
    experience:
      experience !== undefined && experience !== null
        ? Number(experience)
        : total_experience_years !== undefined && total_experience_years !== null
          ? Number(total_experience_years)
          : 0,
    pastProjectScore: pastProjectScore || null,
    photoUrl: photoUrl || null,
  });

  const Skill = require('../models/Skill');
  if (skills && Array.isArray(skills)) {
    const skillDocs = [];
    for (const s of skills) {
      if (!s.skillName) continue;
      
      let skillNameTrimmed = String(s.skillName).trim();
      let dbSkill = await Skill.findOne({
        organizationId,
        skill_name: { $regex: new RegExp(`^${skillNameTrimmed}$`, 'i') }
      });
      
      if (!dbSkill) {
        dbSkill = await Skill.create({
          organizationId,
          skill_name: skillNameTrimmed,
          skill_category: 'General'
        });
      }
      
      skillDocs.push({
        emp_id: employee._id,
        skill_id: dbSkill._id,
        proficiency_level: getProficiencyNumber(s.proficiencyLevel),
        years_experience: s.yearsOfExperience || 0,
        last_used_year: new Date().getFullYear(),
      });
    }

    if (skillDocs.length > 0) {
      await EmployeeSkill.insertMany(skillDocs);
    }
  }

  // Fetch created employee to return with fully populated skills format if needed, but the frontend usually hits GET again
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

  const Skill = require('../models/Skill');
  if (updates.skills && Array.isArray(updates.skills)) {
    await EmployeeSkill.deleteMany({ emp_id: employee._id });
    
    // Process skills sequentially to ensure we get/create correct skill records
    const skillDocs = [];
    for (const s of updates.skills) {
      if (!s.skillName) continue; // Safety check
      
      let skillNameTrimmed = String(s.skillName).trim();
      let dbSkill = await Skill.findOne({
        organizationId: employee.organizationId,
        skill_name: { $regex: new RegExp(`^${skillNameTrimmed}$`, 'i') }
      });
      
      if (!dbSkill) {
        dbSkill = await Skill.create({
          organizationId: employee.organizationId,
          skill_name: skillNameTrimmed,
          skill_category: 'General'
        });
      }
      
      skillDocs.push({
        emp_id: employee._id,
        skill_id: dbSkill._id,
        proficiency_level: getProficiencyNumber(s.proficiencyLevel),
        years_experience: s.yearsOfExperience || 0,
        last_used_year: new Date().getFullYear(),
      });
    }

    if (skillDocs.length > 0) {
      await EmployeeSkill.insertMany(skillDocs);
    }
    delete updates.skills;
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
