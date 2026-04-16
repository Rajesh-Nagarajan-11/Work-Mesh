const mongoose = require('mongoose');
const crypto = require('crypto');

const ProjectRequestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true },
    clientEmail: { type: String, required: true },
    clientName: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'submitted'], default: 'sent' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

ProjectRequestSchema.statics.createWithToken = async function (data) {
  let token = generateToken();
  let exists = await this.findOne({ token });
  while (exists) {
    token = generateToken();
    exists = await this.findOne({ token });
  }
  return this.create({ ...data, token });
};

module.exports = mongoose.model('ProjectRequest', ProjectRequestSchema);
