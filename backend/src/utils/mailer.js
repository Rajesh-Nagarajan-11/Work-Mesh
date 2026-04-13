const nodemailer = require('nodemailer');

let cachedTransporter = null;
let creatingTransporter = null;

async function createTransporter() {
  if (process.env.SMTP_HOST) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';

    // If SMTP_HOST is an IP, set servername so TLS cert validation still works.
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
      tls: host && host.match(/^\d+\.\d+\.\d+\.\d+$/) ? { servername: 'smtp.gmail.com' } : undefined,
    });
  }

  const account = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!creatingTransporter) {
    creatingTransporter = createTransporter().then((transporter) => {
      cachedTransporter = transporter;
      return transporter;
    }).finally(() => {
      creatingTransporter = null;
    });
  }
  return creatingTransporter;
}

async function sendEmail({ to, subject, html, text, from }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: from || process.env.SMTP_FROM || '"Work Mesh" <noreply@workmesh.com>',
    to,
    subject,
    html,
    text,
  });

  let previewUrl = null;
  try {
    if (nodemailer.getTestMessageUrl) previewUrl = nodemailer.getTestMessageUrl(info);
  } catch (_) {}

  return { info, previewUrl };
}

module.exports = { sendEmail, getTransporter };
