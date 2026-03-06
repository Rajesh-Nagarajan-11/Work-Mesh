const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAll, getById, create, update, remove } = require('../controllers/skillController');

const router = express.Router();
router.use(authenticate);

// GET /api/skills - Get all skills in the org
router.get('/', getAll);

// GET /api/skills/:id
router.get('/:id', getById);

// POST /api/skills - Admin/Manager only
router.post('/', requireRole('Admin', 'Manager'), create);

// PUT /api/skills/:id
router.put('/:id', requireRole('Admin', 'Manager'), update);

// DELETE /api/skills/:id - Admin only
router.delete('/:id', requireRole('Admin'), remove);

module.exports = router;
