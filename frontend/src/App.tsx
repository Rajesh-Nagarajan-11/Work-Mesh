import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Projects } from './pages/Projects';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { ProjectDetails } from './pages/ProjectDetails';
import { ProjectTeams } from './pages/ProjectTeams';
import { DemandHirings } from './pages/DemandHirings';
import { ClientProjectRequest } from './pages/ClientProjectRequest';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/client/project-request/:token" element={<ClientProjectRequest />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute>
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/teams"
                element={
                  <ProtectedRoute>
                    <ProjectTeams />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/demand-hirings"
                element={
                  <ProtectedRoute>
                    <DemandHirings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
