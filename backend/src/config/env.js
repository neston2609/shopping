require('dotenv').config();

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing environment variable: ${name}`);
  }
  return v;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '9000', 10),
  databaseUrl: required('DATABASE_URL'),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  encryptionKey: process.env.ENCRYPTION_KEY || '0'.repeat(64),
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@retroconsole1981.gg',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin1981!',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    encryption: process.env.SMTP_ENCRYPTION || 'tls',
    senderEmail: process.env.SMTP_SENDER_EMAIL || 'no-reply@retroconsole1981.gg',
    senderName: process.env.SMTP_SENDER_NAME || 'RETROCONSOLE 1981',
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
};

module.exports = env;
