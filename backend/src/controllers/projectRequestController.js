const Project = require('../models/Project');
const ProjectRequest = require('../models/ProjectRequest');
const Organization = require('../models/Organization');
const { ok, fail } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/mailer');

const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

async function createAndSend(req, res) {
  const { organizationId, id: userId } = req.user;
  const { clientEmail, clientName } = req.body || {};

  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return fail(res, 400, 'Valid client email is required');
  }

  const org = await Organization.findById(organizationId);
  const companyName = org?.companyName || 'Work Mesh';

  const normalizedEmail = String(clientEmail).toLowerCase().trim();
  const normalizedName = clientName ? String(clientName).trim() : '';

  let request = await ProjectRequest.findOne({
    organizationId,
    clientEmail: normalizedEmail,
    status: 'sent',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!request) {
    request = await ProjectRequest.createWithToken({
      organizationId,
      clientEmail: normalizedEmail,
      clientName: normalizedName,
      createdBy: userId,
    });
  } else if (normalizedName && request.clientName !== normalizedName) {
    request.clientName = normalizedName;
    await request.save();
  }

  const formUrl = `${FRONTEND_BASE}/client/project-request/${request.token}`;

  try {
    const { previewUrl } = await sendEmail({
      to: request.clientEmail,
      subject: `Submit your project requirements - ${companyName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Requirements - ${companyName}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 28px 24px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold; color: #ffffff;">W</div>
                    <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Work Mesh</h1>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Project requirements</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hello${request.clientName ? ` ${request.clientName}` : ''},</p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #64748b;">${companyName} has invited you to submit your project requirements. Click the button below to open the form.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${formUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Open Project Requirements Form</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Or copy this link:</p>
              <p style="margin: 0 0 24px 0; font-size: 12px; color: #64748b; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${formUrl}</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">This link is unique and can only be used once.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">— Work Mesh</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Hello${request.clientName ? ` ${request.clientName}` : ''},\n\n${companyName} has invited you to submit your project requirements.\n\nOpen this link to fill out the form:\n${formUrl}\n\nThis link is unique and can only be used once.\n\n— Work Mesh`,
    });
    return ok(
      res,
      {
        token: request.token,
        formUrl,
        clientEmail: request.clientEmail,
        previewUrl, // Ethereal preview URL when using test account
      },
      'Form link created. Email sent.'
    );
  } catch (err) {
    console.error('Email send failed:', err);
    return ok(
      res,
      {
        token: request.token,
        formUrl,
        clientEmail: request.clientEmail,
        emailError: err.message,
      },
      'Form link created. Copy the URL and send to client manually (email failed).'
    );
  }
}

async function getByToken(req, res) {
  const { token } = req.params;
  const request = await ProjectRequest.findOne({ token });
  if (!request) return fail(res, 404, 'Invalid or expired link');
  if (request.expiresAt && request.expiresAt <= new Date()) return fail(res, 400, 'This form link has expired');
  if (request.status === 'submitted') return fail(res, 400, 'This form has already been submitted');
  return ok(res, { token: request.token, clientEmail: request.clientEmail, clientName: request.clientName }, 'OK');
}

async function submitByToken(req, res) {
  const { token } = req.params;
  const body = req.body || {};

  const request = await ProjectRequest.findOne({ token });
  if (!request) return fail(res, 404, 'Invalid or expired link');
  if (request.expiresAt && request.expiresAt <= new Date()) return fail(res, 400, 'This form link has expired');
  if (request.status === 'submitted') return fail(res, 400, 'This form has already been submitted');

  const { name, description, deadline, duration, priority, teamSize, requiredSkills, clientName, domain } = body;

  if (!name || !deadline) {
    return fail(res, 400, 'Project name and deadline are required');
  }

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return fail(res, 400, 'Invalid deadline date');
  }

  const skills = Array.isArray(requiredSkills)
    ? requiredSkills
        .filter((s) => s && s.skillName)
        .map((s, i) => ({
          skillId: s.skillId || `skill-${i}`,
          skillName: String(s.skillName).trim(),
          minimumExperience: parseInt(s.minimumExperience, 10) || 0,
          priority: s.priority || 'Must-have',
          weight: parseInt(s.weight, 10) || 50,
        }))
    : [];

  const project = await Project.create({
    organizationId: request.organizationId,
    name: String(name).trim(),
    project_name: String(name).trim(),
    client_name: clientName ? String(clientName).trim() : request.clientName || null,
    client_email: request.clientEmail,
    domain: domain ? String(domain).trim() : null,
    description: description ? String(description).trim() : '',
    status: 'Draft',
    priority: priority || 'Medium',
    deadline: deadlineDate,
    duration: duration || 1,
    progress: 0,
    requiredSkills: skills,
    teamPreferences: {
      teamSize: Math.max(1, parseInt(teamSize, 10) || 5),
      seniorityMix: { junior: 40, mid: 40, senior: 20 },
    },
    createdBy: request.createdBy,
    source: 'client_form',
  });

  request.status = 'submitted';
  request.projectId = project._id;
  await request.save();

  return ok(res, { projectId: project._id.toString(), message: 'Thank you! Your project requirements have been submitted.' }, 'Submitted');
}

module.exports = { createAndSend, getByToken, submitByToken };
