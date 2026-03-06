const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAll,
    getByEmployee,
    getByProject,
    create,
    update,
    remove,
} = require('../controllers/historyController');

const router = express.Router();
router.use(authenticate);

// GET /api/history
router.get('/', getAll);

// GET /api/history/employee/:empId
router.get('/employee/:empId', getByEmployee);

// GET /api/history/project/:projectId
router.get('/project/:projectId', getByProject);

// POST /api/history
router.post('/', requireRole('Admin', 'Manager'), create);

// PUT /api/history/:id - Update feedback, role etc.
router.put('/:id', requireRole('Admin', 'Manager'), update);

// DELETE /api/history/:id
router.delete('/:id', requireRole('Admin'), remove);

module.exports = router;
