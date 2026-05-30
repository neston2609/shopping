const prisma = require('../lib/prisma');
const { asyncHandler, badRequest, notFound } = require('../utils/http');
const { listForCategory, streamFromCategory, streamInline } = require('../lib/sources');

function publicCategory(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    position: c.position,
  };
}

async function affConfig() {
  const row = await prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
  return { url: row?.affLink || '', delaySeconds: row?.affDelaySeconds || 0 };
}

async function downloadsDisplayConfig() {
  const row = await prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
  return { folderThumbHeight: row?.folderThumbHeight || 48 };
}

const listCategories = asyncHandler(async (req, res) => {
  const [cats, aff, display] = await Promise.all([
    prisma.downloadCategory.findMany({
      where: { enabled: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    }),
    affConfig(),
    downloadsDisplayConfig(),
  ]);
  res.json({ categories: cats.map(publicCategory), aff, display });
});

async function loadCategory(slug) {
  const cat = await prisma.downloadCategory.findUnique({
    where: { slug },
    include: { source: true },
  });
  if (!cat || !cat.enabled) throw notFound('Category not found');
  return cat;
}

const browseCategory = asyncHandler(async (req, res) => {
  const cat = await loadCategory(req.params.slug);
  const sub = req.query.path || '';
  const [items, aff, display] = await Promise.all([
    listForCategory(cat, sub),
    affConfig(),
    downloadsDisplayConfig(),
  ]);
  res.json({
    category: publicCategory(cat),
    path: String(sub).replace(/^\/+|\/+$/g, ''),
    items,
    aff,
    display,
  });
});

const downloadFile = asyncHandler(async (req, res) => {
  const cat = await loadCategory(req.params.slug);
  const sub = req.query.path;
  if (!sub) throw badRequest('A file path is required');
  const info = await streamFromCategory(cat, sub, res);
  prisma.downloadLog
    .create({
      data: {
        userId: req.user?.id || null,
        path: `${cat.slug}/${sub}`,
        fileName: info?.name || String(sub),
        sizeBytes: info?.size ? Number(info.size) : null,
        ip: req.ip,
      },
    })
    .catch(() => {});
});

const thumbnail = asyncHandler(async (req, res) => {
  const cat = await loadCategory(req.params.slug);
  const sub = req.query.path;
  if (!sub) throw badRequest('A path is required');
  await streamInline(cat, sub, res);
});

module.exports = { listCategories, browseCategory, downloadFile, thumbnail };
