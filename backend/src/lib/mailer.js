const nodemailer = require('nodemailer');
const prisma = require('./prisma');
const { decrypt } = require('./crypto');

// ---------------------------------------------------------------------------
// Template rendering: replaces {{variable}} tokens with provided values.
// ---------------------------------------------------------------------------
function render(template, vars = {}) {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = vars[key];
    return val == null ? '' : String(val);
  });
}

// ---------------------------------------------------------------------------
// Build a nodemailer transport from the active SMTP settings row.
// Falls back to a JSON ("dev") transport that does not actually send, so the
// app stays runnable before SMTP credentials are configured.
// ---------------------------------------------------------------------------
async function buildTransport(overrideSettings) {
  const settings = overrideSettings || (await prisma.smtpSettings.findFirst({ orderBy: { id: 'asc' } }));

  if (!settings || !settings.enabled || !settings.username) {
    return { transport: nodemailer.createTransport({ jsonTransport: true }), settings, isDev: true };
  }

  const password = settings.passwordEnc ? decrypt(settings.passwordEnc) : '';
  const secure = settings.encryptionType === 'ssl' || settings.port === 465;
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure,
    auth: { user: settings.username, pass: password },
  });
  return { transport, settings, isDev: false };
}

// ---------------------------------------------------------------------------
// Low-level send + log to email_logs.
// ---------------------------------------------------------------------------
async function deliver({ to, subject, html, templateKey = null, orderId = null, settingsOverride = null }) {
  const { transport, settings, isDev } = await buildTransport(settingsOverride);
  const fromEmail = settings?.senderEmail || 'no-reply@retroconsole1981.gg';
  const fromName = settings?.senderName || 'RETROCONSOLE 1981';

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    await prisma.emailLog.create({
      data: {
        recipient: to,
        subject,
        status: 'sent',
        templateKey,
        relatedOrderId: orderId,
        sentAt: new Date(),
        errorMessage: isDev ? 'Sent via dev (jsonTransport) — configure SMTP to deliver for real.' : null,
      },
    });
    return { ok: true, dev: isDev };
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        recipient: to,
        subject,
        status: 'failed',
        templateKey,
        relatedOrderId: orderId,
        errorMessage: err.message,
      },
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Lightweight in-process async queue. Jobs are processed off the request path,
// one at a time. Swap for BullMQ/Redis in a higher-scale deployment.
// ---------------------------------------------------------------------------
const queue = [];
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      // eslint-disable-next-line no-await-in-loop
      await deliver(job);
    } catch (e) {
      // already logged inside deliver
    }
  }
  draining = false;
}

function enqueue(job) {
  queue.push(job);
  setImmediate(drain);
}

// ---------------------------------------------------------------------------
// High-level: queue a templated email for an order event.
// ---------------------------------------------------------------------------
async function queueTemplateEmail(templateKey, { to, orderId = null, vars = {} }) {
  const template = await prisma.emailTemplate.findUnique({ where: { key: templateKey } });
  const globalSmtp = await prisma.smtpSettings.findFirst({ orderBy: { id: 'asc' } });

  // Respect global notifications toggle and per-template enable flag.
  if (!globalSmtp || !globalSmtp.enabled) {
    await prisma.emailLog.create({
      data: { recipient: to, subject: template?.subject || templateKey, status: 'failed', templateKey, relatedOrderId: orderId, errorMessage: 'Email notifications disabled.' },
    });
    return;
  }
  if (!template || !template.enabled) return;

  const subject = render(template.subject, vars);
  const html = render(template.body, vars);
  enqueue({ to, subject, html, templateKey, orderId });
}

module.exports = { render, buildTransport, deliver, enqueue, queueTemplateEmail };
