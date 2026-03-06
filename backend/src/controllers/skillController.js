const Skill = require('../models/Skill');
const { ok, fail } = require('../utils/apiResponse');

/**
 * GET /api/skills - Get all skills for the organization
 */
async function getAll(req, res) {
    const { organizationId } = req.user;
    const skills = await Skill.find({ organizationId }).sort({ skill_category: 1, skill_name: 1 });
    return ok(res, skills, 'Skills fetched');
}

/**
 * GET /api/skills/:id - Get single skill
 */
async function getById(req, res) {
    const { organizationId } = req.user;
    const skill = await Skill.findOne({ _id: req.params.id, organizationId });
    if (!skill) return fail(res, 404, 'Skill not found');
    return ok(res, skill, 'Skill fetched');
}

/**
 * POST /api/skills - Create a new skill
 */
async function create(req, res) {
    const { organizationId } = req.user;
    const { skill_name, skill_category } = req.body || {};

    if (!skill_name || !skill_category) {
        return fail(res, 400, 'skill_name and skill_category are required');
    }

    const existing = await Skill.findOne({
        organizationId,
        skill_name: String(skill_name).trim(),
    });
    if (existing) return fail(res, 409, 'A skill with this name already exists');

    const skill = await Skill.create({
        organizationId,
        skill_name: String(skill_name).trim(),
        skill_category: String(skill_category).trim(),
    });

    return ok(res, skill, 'Skill created');
}

/**
 * PUT /api/skills/:id - Update a skill
 */
async function update(req, res) {
    const { organizationId } = req.user;
    const { skill_name, skill_category } = req.body || {};

    const skill = await Skill.findOne({ _id: req.params.id, organizationId });
    if (!skill) return fail(res, 404, 'Skill not found');

    if (skill_name) skill.skill_name = String(skill_name).trim();
    if (skill_category) skill.skill_category = String(skill_category).trim();

    await skill.save();
    return ok(res, skill, 'Skill updated');
}

/**
 * DELETE /api/skills/:id - Delete a skill
 */
async function remove(req, res) {
    const { organizationId } = req.user;
    const skill = await Skill.findOneAndDelete({ _id: req.params.id, organizationId });
    if (!skill) return fail(res, 404, 'Skill not found');
    return ok(res, { deleted: true }, 'Skill deleted');
}

module.exports = { getAll, getById, create, update, remove };
