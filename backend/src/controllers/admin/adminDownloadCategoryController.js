const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../utils/http');
const { publicPath } = require('../../lib/upload');

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const upsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().or(z.literal('')),
  sftpPath: z.string().min(1, 'SFTP path is required (e.g. /var/files/roms)'),
  enabled: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

function serialize(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    sftpPath: c.sftpPath,
    enabled: c.enabled,
    position: c.position,
  };
}

const list = asyncHandler(async (req, res) => {
  const cats = await prisma.downloadCategory.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  res.json({ categories: cats.map(serialize) });
});

const create = asyncHandler(async (req, res) => {
  const data = req.body;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  if (!slug) throw badRequest('A slug is required');
  const cat = await prisma.downloadCategory.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      sftpPath: data.sftpPath,
      enabled: data.enabled ?? true,
      position: data.position ?? 0,
    },
  });
  res.status(201).json({ category: serialize(cat) });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  const cat = await prisma.downloadCategory.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug ? slugify(data.slug) : undefined,
      description: data.description || null,
      sftpPath: data.sftpPath,
      enabled: data.enabled ?? undefined,
      position: data.position ?? undefined,
    },
  });
  res.json({ category: serialize(cat) });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.downloadCategory.delete({ where: { id } });
  res.json({ ok: true });
});

// POST /api/admin/download-categories/:id/image  — multipart "image"
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Image is required');
  const id = parseInt(req.params.id, 10);
  const imageUrl = publicPath('categories', req.file.filename);
  const cat = await prisma.downloadCategory.update({ where: { id }, data: { imageUrl } });
  res.json({ category: serialize(cat) });
});

module.exports = { list, create, update, remove, uploadImage, upsertSchema };
