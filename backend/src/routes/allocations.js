const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAll,
    getByEmployee,
    getByProject,
    create,
    update,
    remove,
} = require('../controllers/allocationController');

const router = express.Router();
router.use(authenticate);

// GET /api/allocations
router.get('/', getAll);

// GET /api/allocations/employee/:empId
router.get('/employee/:empId', getByEmployee);

// GET /api/allocations/project/:projectId
router.get('/project/:projectId', getByProject);

// POST /api/allocations - Assign employee to project
router.post('/', requireRole('Admin', 'Manager'), create);

// PUT /api/allocations/:id
router.put('/:id', requireRole('Admin', 'Manager'), update);

// DELETE /api/allocations/:id
router.delete('/:id', requireRole('Admin', 'Manager'), remove);

module.exports = router;
