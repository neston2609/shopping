const prisma = require('../lib/prisma');
const { asyncHandler, badRequest } = require('../utils/http');
const { listDir, streamFile } = require('../lib/sftp');

// GET /api/downloads?path=<subpath>  — list a folder under the configured base path
const browse = asyncHandler(async (req, res) => {
  const sub = req.query.path || '';
  const items = await listDir(sub);
  res.json({ path: String(sub).replace(/^\/+|\/+$/g, ''), items });
});

// GET /api/downloads/file?path=<subpath/file>  — stream a file as an attachment
const download = asyncHandler(async (req, res) => {
  const sub = req.query.path;
  if (!sub) throw badRequest('A file path is required');
  const info = await streamFile(sub, res);
  // Best-effort audit log (response is already streamed at this point).
  prisma.downloadLog
    .create({
      data: {
        userId: req.user?.id || null,
        path: String(sub),
        fileName: info.name,
        sizeBytes: info.size ? Number(info.size) : null,
        ip: req.ip,
      },
    })
    .catch(() => {});
});

module.exports = { browse, download };
