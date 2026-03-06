import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Globe, Lock, Mail, MapPin, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { authService } from '../services/authService';

type SignupForm = {
    companyName: string;
    location: string;
    companyEmail: string;
    password: string;
    confirmPassword: string;
    companySize: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
    website: string;
};

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [form, setForm] = useState<SignupForm>({
        companyName: '',
        location: '',
        companyEmail: '',
        password: '',
        confirmPassword: '',
        companySize: '11-50',
        website: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof SignupForm | 'general', string>>>(
        {}
    );
    const [isLoading, setIsLoading] = useState(false);

    const validate = (): boolean => {
        const next: Partial<Record<keyof SignupForm | 'general', string>> = {};

        if (!form.companyName.trim()) next.companyName = 'Company name is required';
        if (!form.location.trim()) next.location = 'Location is required';

        if (!form.companyEmail.trim()) next.companyEmail = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)) {
            next.companyEmail = 'Invalid email format';
        }

        if (!form.password) next.password = 'Password is required';
        else if (form.password.length < 6) next.password = 'Password must be at least 6 characters';

        if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password';
        else if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match';

        if (form.website.trim()) {
            const val = form.website.trim();
            try {
                // Accept either full URL, or domain by adding https://
                 
                new URL(val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`);
            } catch {
                next.website = 'Please enter a valid website URL';
            }
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!validate()) return;

        setIsLoading(true);
        try {
            await authService.register({
                companyName: form.companyName.trim(),
                location: form.location.trim(),
                email: form.companyEmail.trim(),
                password: form.password,
                companySize: form.companySize,
                website: form.website.trim() || undefined,
            });

            addToast('success', 'Signup successful! Please login to continue.');
            navigate('/login', { replace: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Signup failed. Please try again.';
            setErrors({ general: message });
            addToast('error', message);
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
                className="hidden lg:flex lg:w-[58%] bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 relative overflow-hidden"
            >
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    />
                </div>

                <div className="relative z-10 flex flex-col justify-center px-16 py-12 text-white overflow-y-auto h-full">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">W</span>
                        </div>
                        <span className="text-3xl font-bold">Work Mesh</span>
                    </div>

                    <h1 className="text-5xl font-bold mb-6 leading-tight">Create your workspace</h1>
                    <p className="text-xl text-primary-100 mb-10 max-w-xl">Set up your company profile and start forming smarter teams.

                    </p>

                    <div className="grid grid-cols-1 gap-4 max-w-xl">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Centralize your talent data</h3>
                                <p className="text-primary-100">Track skills, availability, and workload in one place.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Match projects to people</h3>
                                <p className="text-primary-100">Define required skills and generate team options faster.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right Section - Signup Form */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-[42%] flex items-center justify-center px-6 py-12 bg-white"
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
                        <h2 className="text-3xl font-bold text-secondary-900 mb-2">Sign up</h2>
                        <p className="text-secondary-600">Create your company account</p>
                    </div>

                    {errors.general && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg"
                        >
                            <div className="text-error-600 text-sm">{errors.general}</div>
                        </motion.div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-5">
                        <Input
                            label="Company Name *"
                            placeholder="e.g., PSG Tech"
                            leftIcon={<Building2 className="w-5 h-5" />}
                            value={form.companyName}
                            onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                            error={errors.companyName}
                            autoFocus
                        />

                        <Input
                            label="Location *"
                            placeholder="e.g., Coimbatore, IN"
                            leftIcon={<MapPin className="w-5 h-5" />}
                            value={form.location}
                            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                            error={errors.location}
                        />

                        <Input
                            label="Company Email *"
                            type="email"
                            placeholder="admin@company.com"
                            leftIcon={<Mail className="w-5 h-5" />}
                            value={form.companyEmail}
                            onChange={(e) => setForm((p) => ({ ...p, companyEmail: e.target.value }))}
                            error={errors.companyEmail}
                            autoComplete="email"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Company Size</label>
                                <select
                                    value={form.companySize}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            companySize: e.target.value as SignupForm['companySize'],
                                        }))
                                    }
                                    className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                                >
                                    <option value="1-10">1–10</option>
                                    <option value="11-50">11–50</option>
                                    <option value="51-200">51–200</option>
                                    <option value="201-1000">201–1000</option>
                                    <option value="1000+">1000+</option>
                                </select>
                            </div>

                            <Input
                                label="Website (optional)"
                                placeholder="company.com"
                                leftIcon={<Globe className="w-5 h-5" />}
                                value={form.website}
                                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                                error={errors.website}
                            />
                        </div>

                        <Input
                            label="Password *"
                            type="password"
                            placeholder="Create a password"
                            leftIcon={<Lock className="w-5 h-5" />}
                            value={form.password}
                            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                            error={errors.password}
                            autoComplete="new-password"
                        />

                        <Input
                            label="Confirm Password *"
                            type="password"
                            placeholder="Re-enter password"
                            leftIcon={<Lock className="w-5 h-5" />}
                            value={form.confirmPassword}
                            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                            error={errors.confirmPassword}
                            autoComplete="new-password"
                        />

                        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
                            Create account
                        </Button>
                    </form>

                    <div className="mt-6 text-sm text-secondary-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-primary hover:text-primary-700 transition-colors">
                            Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

