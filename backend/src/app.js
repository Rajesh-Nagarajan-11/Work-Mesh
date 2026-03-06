const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const projectRoutes = require('./routes/projects');
const projectRequestRoutes = require('./routes/projectRequests');
const skillRoutes = require('./routes/skills');
const employeeSkillRoutes = require('./routes/employeeSkills');
const allocationRoutes = require('./routes/allocations');
const historyRoutes = require('./routes/history');
const analyticsRoutes = require('./routes/analytics');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api', (req, res) => {
    res.json({ success: true, data: { name: 'Work Mesh API' }, message: 'OK' });
  });

  // Core routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/project-requests', projectRequestRoutes);

  // ER-diagram routes
  app.use('/api/skills', skillRoutes);
  app.use('/api/employees/:empId/skills', employeeSkillRoutes);
  app.use('/api/allocations', allocationRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/analytics', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

