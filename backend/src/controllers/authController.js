const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/token');
const { asyncHandler, unauthorized, conflict, badRequest, notFound } = require('../utils/http');
const { queueTemplateEmail } = require('../lib/mailer');
const env = require('../config/env');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
function hashResetToken(t) { return crypto.createHash('sha256').update(t).digest('hex'); }

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().regex(USERNAME_RE, 'Username must be 3-30 chars (letters, numbers, underscore)').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
});

// Accepts either {identifier, password} (preferred) or {email, password} (legacy).
const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().optional(),
  password: z.string().min(1),
}).refine((v) => !!(v.identifier || v.email), { message: 'Email or username required', path: ['identifier'] });

const credentialsSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email().optional().or(z.literal('')),
  newUsername: z.string().regex(USERNAME_RE, 'Username must be 3-30 chars (letters, numbers, underscore)').optional().or(z.literal('')),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
}).refine((v) => v.newEmail || v.newUsername || v.newPassword, {
  message: 'Provide at least one of newEmail, newUsername, newPassword',
  path: ['newEmail'],
});

const forgotSchema = z.object({
  email: z.string().email(),
});
const resetSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const profileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
});

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    username: u.username || null,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    coins: u.coins,
    role: u.role?.name,
  };
}

const register = asyncHandler(async (req, res) => {
  const { email, username, password, firstName, lastName, phone } = req.body;
  const cleanUsername = username && username.trim() ? username.trim() : null;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(cleanUsername ? [{ username: cleanUsername }] : [])] },
  });
  if (existing) {
    if (existing.email === email) throw conflict('An account with that email already exists');
    throw conflict('That username is already taken');
  }

  const customerRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, username: cleanUsername, passwordHash, firstName, lastName, phone, roleId: customerRole.id },
    include: { role: true },
  });

  // Auto-issue welcome discount: 15% off, min ฿2000, valid 30 days.
  const welcomeCode = `WELCOME-${nanoid(8).toUpperCase()}`;
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.discountCode.create({
    data: {
      code: welcomeCode,
      description: 'Welcome — 15% off, min ฿2000, valid 30 days',
      type: 'percent',
      value: 15,
      minSubtotal: 2000,
      validUntil,
      perUserLimit: 1,
      userId: user.id,
      enabled: true,
    },
  });

  // Email the code (queued; respects SMTP enabled flag).
  queueTemplateEmail('welcome_discount', {
    to: user.email,
    vars: {
      customer_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      discount_code: welcomeCode,
      discount_value: '15%',
      discount_min: '฿2,000',
      discount_expiry: validUntil.toLocaleDateString('en-GB'),
    },
  }).catch(() => {});

  const token = signToken({ sub: user.id, role: user.role.name });
  res.status(201).json({ token, user: publicUser(user), welcomeCode });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const id = (identifier || email || '').trim();
  if (!id) throw unauthorized('Invalid credentials');
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { username: id }] },
    include: { role: true },
  });
  if (!user || !user.isActive) throw unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');

  const token = signToken({ sub: user.id, role: user.role.name });
  res.json({ token, user: publicUser(user) });
});

// PATCH /api/auth/credentials  — change email / username / password (auth required)
const updateCredentials = asyncHandler(async (req, res) => {
  const { currentPassword, newEmail, newUsername, newPassword } = req.body;
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, include: { role: true } });
  if (!me) throw unauthorized('Invalid session');
  const ok = await bcrypt.compare(currentPassword, me.passwordHash);
  if (!ok) throw unauthorized('Current password is incorrect');

  const data = {};
  if (newEmail && newEmail !== me.email) {
    const taken = await prisma.user.findFirst({ where: { email: newEmail, NOT: { id: me.id } } });
    if (taken) throw conflict('That email is already in use');
    data.email = newEmail;
  }
  if (newUsername !== undefined) {
    const cleaned = newUsername && newUsername.trim() ? newUsername.trim() : null;
    if (cleaned !== me.username) {
      if (cleaned) {
        const taken = await prisma.user.findFirst({ where: { username: cleaned, NOT: { id: me.id } } });
        if (taken) throw conflict('That username is already in use');
      }
      data.username = cleaned;
    }
  }
  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return res.json({ user: publicUser(me) });
  }

  const updated = await prisma.user.update({ where: { id: me.id }, data, include: { role: true } });
  res.json({ user: publicUser(updated) });
});

// POST /api/auth/forgot-password  — public; always responds 200 even if the
// email isn't on file (don't leak which addresses are registered).
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (user && user.isActive) {
    // Invalidate any previous unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const raw = crypto.randomBytes(32).toString('hex'); // 64 chars
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    const resetLink = `${env.publicUrl.replace(/\/$/, '')}/reset-password?token=${raw}`;
    queueTemplateEmail('password_reset', {
      to: user.email,
      vars: {
        customer_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        reset_link: resetLink,
        expires_in: '1 hour',
      },
    }).catch(() => {});
  }
  // Always succeed (anti-enumeration)
  res.json({ ok: true, message: 'If that email is on file, a reset link is on its way.' });
});

// POST /api/auth/reset-password  — public; consumes a valid token, sets new password.
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { include: { role: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user || !row.user.isActive) {
    throw badRequest('This reset link is invalid or has expired. Request a new one.');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Burn any other live tokens for this user too.
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, NOT: { id: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);
  // Auto-login by issuing a fresh JWT
  const tokenJwt = signToken({ sub: row.user.id, role: row.user.role.name });
  res.json({ ok: true, token: tokenJwt, user: publicUser(row.user) });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: req.body,
    include: { role: true },
  });
  res.json({ user: publicUser(user) });
});

module.exports = {
  register,
  login,
  logout,
  me,
  updateProfile,
  updateCredentials,
  forgotPassword,
  resetPassword,
  registerSchema,
  loginSchema,
  profileSchema,
  credentialsSchema,
  forgotSchema,
  resetSchema,
  publicUser,
};
