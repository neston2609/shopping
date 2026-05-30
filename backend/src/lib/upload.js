const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Files are written under backend/uploads/<subdir> and served at /uploads/<subdir>.
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
ensureDir(path.join(UPLOAD_ROOT, 'qr'));
ensureDir(path.join(UPLOAD_ROOT, 'slips'));
ensureDir(path.join(UPLOAD_ROOT, 'categories'));

function makeUploader(subdir) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subdir)),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.png').toLowerCase();
      cb(null, `${subdir}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
      if (/^image\//.test(file.mimetype)) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    },
  });
}

// Public path for a stored file (served by nginx /uploads or express static).
const publicPath = (subdir, filename) => `/uploads/${subdir}/${filename}`;

module.exports = {
  qrUpload: makeUploader('qr'),
  slipUpload: makeUploader('slips'),
  categoryImageUpload: makeUploader('categories'),
  UPLOAD_ROOT,
  publicPath,
};
