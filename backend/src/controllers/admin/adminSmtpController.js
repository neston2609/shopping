const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, badRequest } = require('../../utils/http');
const { encrypt, decrypt } = require('../../lib/crypto');
const { buildTransport, deliver } = require('../../lib/mailer');

const updateSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  username: z.string().optional(),
  password: z.string().optional(), // plaintext; only updated if provided
  encryptionType: z.enum(['tls', 'ssl']),
  senderEmail: z.string().email().optional().or(z.literal('')),
  senderName: z.string().optional(),
  provider: z.string().optional(),
  enabled: z.boolean().optional(),
});

const testSchema = z.object({ to: z.string().email() });

async function getSettingsRow() {
  let row = await prisma.smtpSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.smtpSettings.create({ data: {} });
  return row;
}

function publicSettings(row) {
  return {
    id: row.id,
    host: row.host,
    port: row.port,
    username: row.username,
    hasPassword: !!row.passwordEnc,
    encryptionType: row.encryptionType,
    senderEmail: row.senderEmail,
    senderName: row.senderName,
    provider: row.provider,
    enabled: row.enabled,
    gmailNote:
      'To use Gmail SMTP, enable 2-Step Verification in your Google account and create a Gmail App Password. Use the App Password instead of your Gmail password.',
  };
}

const get = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  res.json({ settings: publicSettings(row) });
});

const update = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const data = req.body;
  const patch = {
    host: data.host,
    port: data.port,
    username: data.username,
    encryptionType: data.encryptionType,
    senderEmail: data.senderEmail || null,
    senderName: data.senderName,
    provider: data.provider || row.provider,
    enabled: data.enabled ?? row.enabled,
  };
  if (data.password) patch.passwordEnc = encrypt(data.password);
  const saved = await prisma.smtpSettings.update({ where: { id: row.id }, data: patch });
  res.json({ settings: publicSettings(saved) });
});

// POST /api/admin/smtp/test-connection
const testConnection = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  if (!row.username) throw badRequest('Set an SMTP username before testing');
  const password = row.passwordEnc ? decrypt(row.passwordEnc) : '';
  const settingsForTest = { ...row, passwordEnc: row.passwordEnc, enabled: true };
  const { transport } = await buildTransport(settingsForTest);
  try {
    await transport.verify();
    res.json({ ok: true, message: 'SMTP connection successful' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// POST /api/admin/smtp/test-email
const sendTestEmail = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const settingsForTest = { ...row, enabled: true };
  const result = await deliver({
    to: req.body.to,
    subject: 'RETROCONSOLE 1981 — SMTP Test Email',
    html: '<h2 style="font-family:monospace">▶ SMTP TEST OK</h2><p>If you can read this, your RETROCONSOLE 1981 mail relay is online. Player 1, ready.</p>',
    settingsOverride: settingsForTest,
    templateKey: 'smtp_test',
  });
  if (result.ok) res.json({ ok: true, dev: result.dev, message: result.dev ? 'Sent via dev transport (no real SMTP configured)' : 'Test email sent' });
  else res.status(400).json({ ok: false, message: result.error });
});

module.exports = { get, update, testConnection, sendTestEmail, updateSchema, testSchema };
