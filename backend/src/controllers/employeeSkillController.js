const EmployeeSkill = require('../models/EmployeeSkill');
const Employee = require('../models/Employee');
const Skill = require('../models/Skill');
const { ok, fail } = require('../utils/apiResponse');

/**
 * GET /api/employees/:empId/skills - Get all skills for an employee
 */
async function getByEmployee(req, res) {
    const { organizationId } = req.user;
    const { empId } = req.params;

    // Verify employee belongs to org
    const emp = await Employee.findOne({ _id: empId, organizationId });
    if (!emp) return fail(res, 404, 'Employee not found');

    const skills = await EmployeeSkill.find({ emp_id: empId }).populate('skill_id');
    return ok(res, skills, 'Employee skills fetched');
}

/**
 * POST /api/employees/:empId/skills - Add or update a skill for an employee
 */
async function upsert(req, res) {
    const { organizationId } = req.user;
    const { empId } = req.params;
    const { skill_id, proficiency_level, years_experience, last_used_year } = req.body || {};

    if (!skill_id) return fail(res, 400, 'skill_id is required');

    // Verify employee belongs to org
    const emp = await Employee.findOne({ _id: empId, organizationId });
    if (!emp) return fail(res, 404, 'Employee not found');

    // Verify skill belongs to org
    const skill = await Skill.findOne({ _id: skill_id, organizationId });
    if (!skill) return fail(res, 404, 'Skill not found');

    const empSkill = await EmployeeSkill.findOneAndUpdate(
        { emp_id: empId, skill_id },
        {
            emp_id: empId,
            skill_id,
            proficiency_level: proficiency_level ?? 1,
            years_experience: years_experience ?? 0,
            last_used_year: last_used_year ?? new Date().getFullYear(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await empSkill.populate('skill_id');
    return ok(res, empSkill, 'Employee skill saved');
}

/**
 * DELETE /api/employees/:empId/skills/:skillId - Remove a skill from an employee
 */
async function remove(req, res) {
    const { organizationId } = req.user;
    const { empId, skillId } = req.params;

    // Verify employee belongs to org
    const emp = await Employee.findOne({ _id: empId, organizationId });
    if (!emp) return fail(res, 404, 'Employee not found');

    const deleted = await EmployeeSkill.findOneAndDelete({ emp_id: empId, skill_id: skillId });
    if (!deleted) return fail(res, 404, 'Skill assignment not found');

    return ok(res, { deleted: true }, 'Employee skill removed');
}

module.exports = { getByEmployee, upsert, remove };
