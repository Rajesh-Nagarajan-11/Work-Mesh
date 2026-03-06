const mongoose = require('mongoose');

/**
 * EMPLOYEE_SKILLS join table (ER diagram)
 * emp_id (FK -> Employee), skill_id (FK -> Skill)
 * proficiency_level (INT 1-5), years_experience (INT), last_used_year (INT)
 */
const EmployeeSkillSchema = new mongoose.Schema(
    {
        emp_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        skill_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill',
            required: true,
            index: true,
        },
        // 1=Beginner, 2=Elementary, 3=Intermediate, 4=Advanced, 5=Expert
        proficiency_level: { type: Number, min: 1, max: 5, default: 1 },
        years_experience: { type: Number, default: 0, min: 0 },
        last_used_year: {
            type: Number,
            default: () => new Date().getFullYear(),
        },
    },
    { timestamps: true }
);

// One record per employee-skill pair
EmployeeSkillSchema.index({ emp_id: 1, skill_id: 1 }, { unique: true });

EmployeeSkillSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

EmployeeSkillSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model('EmployeeSkill', EmployeeSkillSchema);
