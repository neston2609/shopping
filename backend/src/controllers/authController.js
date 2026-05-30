const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/token');
const { asyncHandler, unauthorized, conflict, notFound } = require('../utils/http');

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

  const token = signToken({ sub: user.id, role: user.role.name });
  res.status(201).json({ token, user: publicUser(user) });
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
  registerSchema,
  loginSchema,
  profileSchema,
  credentialsSchema,
  publicUser,
};
