const mongoose = require('mongoose');

const ProjectSkillSchema = new mongoose.Schema(
  {
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    minimumExperience: { type: Number, default: 0 },
    priority: { type: String, enum: ['Must-have', 'Nice-to-have'], default: 'Must-have' },
    weight: { type: Number, default: 50, min: 0, max: 100 },
  },
  { _id: true }
);

const TeamPreferencesSchema = new mongoose.Schema(
  {
    teamSize: { type: Number, default: 5 },
    seniorityMix: {
      junior: { type: Number, default: 40 },
      mid: { type: Number, default: 40 },
      senior: { type: Number, default: 20 },
    },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    // ER: project_id (PK) - auto-generated _id
    project_name: { type: String, trim: true, default: null }, // ER field alias
    name: { type: String, required: true, trim: true }, // kept for compatibility
    client_name: { type: String, default: null, trim: true },
    client_email: { type: String, default: null, trim: true, lowercase: true },
    domain: { type: String, default: null, trim: true },
    description: { type: String, default: '' },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    deadline: { type: Date, required: true }, // kept for compatibility
    project_budget: { type: Number, default: null, min: 0 },
    // ER priority_level as INT (1=Low, 2=Medium, 3=High, 4=Critical, 5=Urgent)
    priority_level: { type: Number, default: 2, min: 1, max: 5 },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Completed', 'Archived'],
      default: 'Draft',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    duration: { type: Number, default: 1 }, // months
    progress: { type: Number, default: 0, min: 0, max: 100 },
    requiredSkills: { type: [ProjectSkillSchema], default: [] },
    teamPreferences: {
      type: TeamPreferencesSchema,
      default: () => ({ teamSize: 5, seniorityMix: { junior: 40, mid: 40, senior: 20 } }),
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    source: { type: String, enum: ['manual', 'client_form'], default: 'manual' },
  },
  { timestamps: true }
);

ProjectSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

ProjectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toHexString();
    delete ret._id;
    delete ret.__v;
    ret.deadline = ret.deadline ? new Date(ret.deadline).toISOString() : null;
    ret.requiredSkills = (ret.requiredSkills || []).map((s) => ({
      ...s,
      id: s._id ? s._id.toString() : s.id || undefined,
      _id: undefined,
    }));
    ret.teamPreferences = ret.teamPreferences || { teamSize: 5, seniorityMix: { junior: 40, mid: 40, senior: 20 } };
    return ret;
  },
});

module.exports = mongoose.model('Project', ProjectSchema);
