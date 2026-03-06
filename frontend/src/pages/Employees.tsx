import React, { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Users, Plus, Search } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { AddEmployeeModal } from '../components/employees/AddEmployeeModal';
import { EditEmployeeModal } from '../components/employees/EditEmployeeModal';
import { EmployeeHistoryModal } from '../components/employees/EmployeeHistoryModal';
import { EmployeeList } from '../components/employees/EmployeeList';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Employee } from '../types';
import { employeeService } from '../services/employeeService';
import { useToast } from '../components/ui/Toast';

export const Employees: React.FC = () => {
    const { addToast } = useToast();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Fetch employees from API
    const fetchEmployees = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await employeeService.getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            addToast('error', 'Failed to load employees');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleAddEmployee = () => {
        setIsAddModalOpen(true);
    };

    const handleModalClose = () => {
        setIsAddModalOpen(false);
    };

    const handleEmployeeAdded = (created?: Employee) => {
        if (!created) return;
        setEmployees((prev) => [created, ...prev]);
        addToast('success', 'Employee added successfully');
    };

    const handleEditEmployee = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsEditModalOpen(true);
    };

    const handleHistoryEmployee = (employee: Employee) => {
        setHistoryEmployee(employee);
        setIsHistoryModalOpen(true);
    };

    const handleDeleteEmployee = async (employee: Employee) => {
        if (!confirm(`Are you sure you want to delete ${employee.name}?`)) {
            return;
        }

        try {
            await employeeService.deleteEmployee(employee.id);
            setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
            addToast('success', 'Employee deleted');
        } catch (error) {
            console.error('Failed to delete employee:', error);
            addToast('error', 'Failed to delete employee');
        }
    };

    const handleEmployeeUpdated = async (updated: Employee) => {
        try {
            const result = await employeeService.updateEmployee(updated.id, updated);
            setEmployees((prev) => prev.map((e) => (e.id === result.id ? result : e)));
            addToast('success', 'Employee updated');
        } catch (error) {
            console.error('Failed to update employee:', error);
            addToast('error', 'Failed to update employee');
        }
    };

    // Filter employees based on search and status
    const filteredEmployees = employees.filter((employee) => {
        const matchesSearch =
            employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.role.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' || employee.availability?.status === filterStatus || employee.availability_status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
                            Employees
                        </h1>
                        <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                            Manage your team members and their skills
                        </p>
                    </div>
                    <Button
                        onClick={handleAddEmployee}
                        leftIcon={<Plus className="w-5 h-5" />}
                    >
                        Add Employee
                    </Button>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by name, email, department, or role..."
                            leftIcon={<Search className="w-5 h-5" />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            showClearButton
                            onClear={() => setSearchQuery('')}
                        />
                    </div>
                    <div className="w-full sm:w-64">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 text-base border border-border rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        >
                            <option value="all">All Availability</option>
                            <option value="Available">Available</option>
                            <option value="Partially Available">Partially Available</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                    </div>
                </div>

                {/* Employee Count */}
                <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400">
                    <Users className="w-4 h-4" />
                    <span>
                        Showing {filteredEmployees.length} of {employees.length} employees
                    </span>
                </div>

                {/* Employee List or Empty State */}
                {filteredEmployees.length > 0 ? (
                    <EmployeeList
                        employees={filteredEmployees}
                        onEdit={handleEditEmployee}
                        onDelete={handleDeleteEmployee}
                        onHistory={handleHistoryEmployee}
                    />
                ) : employees.length === 0 ? (
                    <EmptyState
                        icon={<Users className="w-16 h-16" />}
                        title="No Employees Yet"
                        description="Get started by adding your first employee to the system."
                        action={{
                            label: 'Add Employee',
                            onClick: handleAddEmployee,
                        }}
                    />
                ) : (
                    <EmptyState
                        icon={<Search className="w-16 h-16" />}
                        title="No Results Found"
                        description="No employees match your search criteria. Try adjusting your filters."
                    />
                )}
            </div>

            {/* Add Employee Modal */}
            <AddEmployeeModal
                isOpen={isAddModalOpen}
                onClose={handleModalClose}
                onSuccess={handleEmployeeAdded}
            />

            {/* Edit Employee Modal */}
            <EditEmployeeModal
                isOpen={isEditModalOpen}
                employee={editingEmployee}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingEmployee(null);
                }}
                onSave={handleEmployeeUpdated}
            />

            {/* Employee History Modal */}
            <EmployeeHistoryModal
                isOpen={isHistoryModalOpen}
                employee={historyEmployee}
                onClose={() => {
                    setIsHistoryModalOpen(false);
                    setHistoryEmployee(null);
                }}
            />
        </MainLayout>
    );
};
