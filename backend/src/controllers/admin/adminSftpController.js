const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');

// Legacy SftpSettings is now used ONLY for downloads display globals (master
// enable, affiliate gate, folder.jpg thumb height). Per-server config lives in
// DownloadSource (one row per site). The host/username/password/basePath columns
// are kept for backward compat / migration but no longer driven from the admin UI.
const updateSchema = z.object({
  enabled: z.boolean().optional(),
  affLink: z.string().optional().or(z.literal('')),
  affDelaySeconds: z.coerce.number().int().min(0).max(120).default(0),
  folderThumbHeight: z.coerce.number().int().min(16).max(400).default(48),
  downloadPageSize: z.coerce.number().int().min(5).max(500).default(50),
});

async function getRow() {
  let row = await prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.sftpSettings.create({ data: {} });
  return row;
}

function publicSettings(row) {
  return {
    id: row.id,
    enabled: row.enabled,
    affLink: row.affLink || '',
    affDelaySeconds: row.affDelaySeconds || 0,
    folderThumbHeight: row.folderThumbHeight || 48,
    downloadPageSize: row.downloadPageSize || 50,
  };
}

const get = asyncHandler(async (req, res) => {
  res.json({ settings: publicSettings(await getRow()) });
});

const update = asyncHandler(async (req, res) => {
  const row = await getRow();
  const { enabled, affLink, affDelaySeconds, folderThumbHeight, downloadPageSize } = req.body;
  const data = {
    enabled: enabled ?? row.enabled,
    affLink: affLink !== undefined ? (affLink || null) : undefined,
    affDelaySeconds: affDelaySeconds ?? undefined,
    folderThumbHeight: folderThumbHeight ?? undefined,
    downloadPageSize: downloadPageSize ?? undefined,
  };
  const saved = await prisma.sftpSettings.update({ where: { id: row.id }, data });
  res.json({ settings: publicSettings(saved) });
});

// GET /api/admin/downloads/logs  — recent download audit
const listLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.downloadLog.findMany({
    orderBy: { id: 'desc' },
    take: 50,
    include: { user: true },
  });
  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      fileName: l.fileName,
      path: l.path,
      sizeBytes: l.sizeBytes,
      user: l.user ? l.user.email : 'guest',
      ip: l.ip,
      createdAt: l.createdAt,
    })),
  });
});

module.exports = { get, update, listLogs, updateSchema };
