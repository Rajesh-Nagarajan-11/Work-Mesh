import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Users, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { LoginRequest } from '../types';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [formData, setFormData] = useState<LoginRequest>({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>(
        {}
    );
    const [isLoading, setIsLoading] = useState(false);

    const features = [
        {
            icon: <Users className="w-5 h-5" />,
            title: 'Competency-Driven Composition',
            description: 'Multi-criteria optimisation engine matches proficiency vectors to project skill requirements with cosine similarity scoring',
        },
        {
            icon: <Zap className="w-5 h-5" />,
            title: 'Expedited Workforce Deployment',
            description: 'Greedy set-cover algorithm synthesises optimal team configurations in seconds, eliminating weeks of manual deliberation',
        },
    ];

    const validate = (): boolean => {
        const newErrors: typeof errors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!validate()) {
            // Shake animation on error
            const form = e.currentTarget as HTMLFormElement;
            form.classList.add('animate-shake');
            setTimeout(() => form.classList.remove('animate-shake'), 500);
            return;
        }

        setIsLoading(true);

        try {
            await login(formData);

            // Navigate to the page they were trying to access, or dashboard
            const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        } catch (error) {
            setErrors({
                general: error instanceof Error ? error.message : 'Login failed. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Section - Brand */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 relative overflow-hidden"
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative z-10 flex flex-col justify-center px-16 py-12 text-white overflow-y-auto h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">W</span>
                        </div>
                        <span className="text-3xl font-bold">Work Mesh</span>
                    </div>

                    {/* Tagline */}
                    <h1 className="text-5xl font-bold mb-6 leading-tight">
                        Streamline Your Team Formation Process
                    </h1>

                    <p className="text-xl text-primary-100 mb-12 max-w-lg">
                        Algorithmic team composition powered by machine learning. Build optimally balanced teams in minutes, not weeks.
                    </p>

                    {/* Features */}
                    <div className="space-y-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                                className="flex items-start gap-4"
                            >
                                <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                                    <p className="text-primary-100">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Social Proof */}
                    {/* Social Proof section removed as requested */}
                </div>
            </motion.div>

            {/* Right Section - Login Form */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-[40%] flex items-center justify-center px-6 py-12 bg-white"
            >
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-400 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">W</span>
                        </div>
                        <span className="text-2xl font-bold text-secondary-900">Work Mesh</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-secondary-900 mb-2">Welcome back</h2>
                        <p className="text-secondary-600">Sign in to your account to continue</p>
                    </div>

                    {/* Error Message */}
                    {errors.general && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3"
                        >
                            <div className="text-error-600 text-sm">{errors.general}</div>
                        </motion.div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            type="email"
                            label="Email Address"
                            placeholder="you@example.com"
                            leftIcon={<Mail className="w-5 h-5" />}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            error={errors.email}
                            autoComplete="email"
                            autoFocus
                        />

                        <Input
                            type="password"
                            label="Password"
                            placeholder="Enter your password"
                            leftIcon={<Lock className="w-5 h-5" />}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            error={errors.password}
                            autoComplete="current-password"
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                />
                                <span className="text-sm text-secondary-700">Remember me</span>
                            </label>

                           
                        </div>

                        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-6 text-sm text-secondary-600">
                        Don&apos;t have an account?{' '}
                        <Link to="/signup" className="font-medium text-primary hover:text-primary-700 transition-colors">
                            Sign up
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Shake animation for form validation errors
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}
.animate-shake {
  animation: shake 0.5s;
}
`;

// Inject shake animation styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = shakeKeyframes;
    document.head.appendChild(style);
}
