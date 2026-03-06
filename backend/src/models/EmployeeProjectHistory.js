const mongoose = require('mongoose');

/**
 * EMPLOYEE_PROJECT_HISTORY (ER diagram)
 * Tracks which projects each employee has worked on historically.
 */
const EmployeeProjectHistorySchema = new mongoose.Schema(
    {
        emp_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },
        role_in_project: { type: String, default: 'Developer', trim: true },
        allocation_percentage: { type: Number, default: 100, min: 0, max: 100 },
        // 1-10 feedback score from project manager
        performance_feedback: { type: Number, default: null, min: 1, max: 10 },
        domain_experience_year: {
            type: Number,
            default: () => new Date().getFullYear(),
        },
    },
    { timestamps: true }
);

EmployeeProjectHistorySchema.virtual('id').get(function () {
    return this._id.toHexString();
});

EmployeeProjectHistorySchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model('EmployeeProjectHistory', EmployeeProjectHistorySchema);
