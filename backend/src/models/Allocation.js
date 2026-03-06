const mongoose = require('mongoose');

/**
 * ALLOCATIONS (ER diagram)
 * Records which employees are actively assigned to which projects.
 */
const AllocationSchema = new mongoose.Schema(
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
        allocation_start_date: { type: Date, required: true },
        allocation_end_date: { type: Date, default: null },
        allocation_percentage: { type: Number, default: 100, min: 1, max: 100 },
    },
    { timestamps: true }
);

AllocationSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

AllocationSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model('Allocation', AllocationSchema);
