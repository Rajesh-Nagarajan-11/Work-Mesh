import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggle } from '../ThemeToggle';

export const Navbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const navLinks = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Employees', path: '/employees' },
        { label: 'Projects', path: '/projects' },
        { label: 'Demand Hirings', path: '/demand-hirings' },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-border z-30 h-16 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-400 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">W</span>
                        </div>
                        <span className="text-xl font-bold text-secondary-900 dark:text-white group-hover:text-primary transition-colors">
                            Work Mesh
                        </span>
                    </Link>

                    {/* Right Side - Navigation & User Menu */}
                    <div className="flex items-center gap-8">
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative px-3 py-2 text-sm font-medium transition-colors ${isActive(link.path)
                                        ? 'text-primary'
                                        : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
                                        }`}
                                >
                                    {link.label}
                                    {isActive(link.path) && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* User Menu Section */}
                        <div className="flex items-center gap-4">
                            <ThemeToggle />

                            {/* Desktop User Dropdown */}
                            <div className="hidden md:block relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold">
                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-sm font-medium text-secondary-700 dark:text-secondary-200">{user?.name}</span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-secondary-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''
                                            }`}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border py-1 z-20"
                                            >
                                                <Link
                                                    to="/profile"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-slate-700 transition-colors"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                >
                                                    <User className="w-4 h-4" />
                                                    Profile
                                                </Link>
                                                <Link
                                                    to="/settings"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-slate-700 transition-colors"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    Settings
                                                </Link>
                                                <hr className="my-1 border-border" />
                                                <button
                                                    onClick={() => {
                                                        setIsUserMenuOpen(false);
                                                        handleLogout();
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors w-full text-left"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Logout
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Toggle mobile menu"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-6 h-6 text-secondary-600 dark:text-secondary-300" />
                                ) : (
                                    <Menu className="w-6 h-6 text-secondary-600 dark:text-secondary-300" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-white dark:bg-slate-900 border-t border-border overflow-hidden"
                    >
                        <div className="px-4 py-4 space-y-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.path)
                                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary'
                                        : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            <hr className="my-2 border-border" />

                            <Link
                                to="/profile"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <User className="w-4 h-4" />
                                Profile
                            </Link>

                            <Link
                                to="/settings"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </Link>

                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    handleLogout();
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors w-full text-left"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
