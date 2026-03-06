const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        skill_name: { type: String, required: true, trim: true },
        skill_category: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

// Unique skill name per organization
SkillSchema.index({ organizationId: 1, skill_name: 1 }, { unique: true });

SkillSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

SkillSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model('Skill', SkillSchema);
