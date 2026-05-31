const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');

// LINE OA Chat Plugin embed snippet — at most ~4KB of HTML/JS from LINE.
// Admin pastes exactly what LINE OA Manager hands them; we don't try to
// validate the contents because LINE may change the format over time.
const LINE_EMBED_MAX = 4000;

const updateSchema = z.object({
  heroHeading: z.string().optional().or(z.literal('')),
  heroSubheading: z.string().optional().or(z.literal('')),
  lineChatEmbed: z.string().max(LINE_EMBED_MAX, `Snippet exceeds ${LINE_EMBED_MAX} characters`).optional().or(z.literal('')),
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
    lineChatEmbed: row.lineChatEmbed || '',
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
      lineChatEmbed: req.body.lineChatEmbed ? req.body.lineChatEmbed.trim() : null,
    },
  });
  res.json({ settings: publicSettings(saved) });
});

module.exports = { get, update, updateSchema };
