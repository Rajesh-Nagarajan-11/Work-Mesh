const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAll, getById, create, update, remove } = require('../controllers/projectController');
const { recommendTeam } = require('../controllers/teamFormationController');

const router = express.Router();
router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', requireRole('Admin', 'Manager'), create);
router.put('/:id', update);
router.delete('/:id', requireRole('Admin', 'Manager'), remove);

// ML team recommendation — proxies to Python FastAPI
router.get('/:id/recommend-team', recommendTeam);

module.exports = router;
