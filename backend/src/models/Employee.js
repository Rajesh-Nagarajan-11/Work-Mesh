const mongoose = require('mongoose');

const EmployeeAvailabilitySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Available', 'Partially Available', 'Unavailable'],
      default: 'Available',
    },
    currentProject: { type: String, default: null },
    currentWorkload: { type: Number, default: 0, min: 0, max: 100 },
    availableFrom: { type: Date, default: null },
  },
  { _id: false }
);

const EmployeeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    // ER: emp_id (PK) - auto-generated _id
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'Employee', trim: true }, // Job title/role
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, default: null },
    department: { type: String, default: 'General' },

    // ER diagram fields
    total_experience_years: { type: Number, default: 0, min: 0 },
    communication_score: { type: Number, default: null, min: 0, max: 10 },
    teamwork_score: { type: Number, default: null, min: 0, max: 10 },
    performance_rating: { type: Number, default: null, min: 0, max: 10 },
    error_rate: { type: Number, default: null, min: 0, max: 100 },
    availability_status: {
      type: String,
      enum: ['Available', 'Partially Available', 'Unavailable'],
      default: 'Available',
    },
    location: { type: String, default: null, trim: true },

    // Access control role (for login permissions)
    accessRole: {
      type: String,
      enum: ['Admin', 'Manager', 'Employee'],
      default: 'Employee',
    },

    // Password hash - only set for employees who can login
    passwordHash: { type: String, default: null },

    // Legacy embedded fields kept for backward compatibility
    experience: { type: Number, default: 0 }, // alias for total_experience_years
    pastProjectScore: { type: Number, default: null, min: 0, max: 100 },
    photoUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound unique index: email must be unique within an organization
EmployeeSchema.index({ organizationId: 1, email: 1 }, { unique: true });

// Virtual for id (to match frontend expectation)
EmployeeSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
EmployeeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash; // Never expose password hash
    return ret;
  },
});

module.exports = mongoose.model('Employee', EmployeeSchema);
