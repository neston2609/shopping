const prisma = require('../lib/prisma');
const { asyncHandler, badRequest, notFound } = require('../utils/http');
const { listForCategory, streamFromCategory } = require('../lib/sftp');

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

// GET /api/downloads — list enabled download categories
const listCategories = asyncHandler(async (req, res) => {
  const cats = await prisma.downloadCategory.findMany({
    where: { enabled: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
  res.json({ categories: cats.map(publicCategory) });
});

async function loadCategory(slug) {
  const cat = await prisma.downloadCategory.findUnique({ where: { slug } });
  if (!cat || !cat.enabled) throw notFound('Category not found');
  return cat;
}

// GET /api/downloads/:slug?path=<sub>  — browse files/subfolders within a category
const browseCategory = asyncHandler(async (req, res) => {
  const cat = await loadCategory(req.params.slug);
  const sub = req.query.path || '';
  const items = await listForCategory(cat, sub);
  res.json({
    category: publicCategory(cat),
    path: String(sub).replace(/^\/+|\/+$/g, ''),
    items,
  });
});

// GET /api/downloads/:slug/file?path=<sub>  — stream a file from a category
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
        fileName: info.name,
        sizeBytes: info.size ? Number(info.size) : null,
        ip: req.ip,
      },
    })
    .catch(() => {});
});

module.exports = { listCategories, browseCategory, downloadFile };
