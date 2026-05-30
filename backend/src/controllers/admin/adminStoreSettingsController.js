const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');

const updateSchema = z.object({
  heroHeading: z.string().optional().or(z.literal('')),
  heroSubheading: z.string().optional().or(z.literal('')),
});

async function getRow() {
  let row = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.storeSettings.create({ data: {} });
  return row;
}

function publicSettings(row) {
  return {
    heroHeading: row.heroHeading || '',
    heroSubheading: row.heroSubheading || '',
  };
}

const get = asyncHandler(async (req, res) => {
  res.json({ settings: publicSettings(await getRow()) });
});

const update = asyncHandler(async (req, res) => {
  const row = await getRow();
  const saved = await prisma.storeSettings.update({
    where: { id: row.id },
    data: {
      heroHeading: req.body.heroHeading || null,
      heroSubheading: req.body.heroSubheading || null,
    },
  });
  res.json({ settings: publicSettings(saved) });
});

module.exports = { get, update, updateSchema };
