const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getByEmployee, upsert, remove } = require('../controllers/employeeSkillController');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// GET /api/employees/:empId/skills
router.get('/', getByEmployee);

// POST /api/employees/:empId/skills - Add or update a skill
router.post('/', upsert);

// DELETE /api/employees/:empId/skills/:skillId
router.delete('/:skillId', remove);

module.exports = router;
