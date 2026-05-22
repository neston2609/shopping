const app = require('./app');
const env = require('./config/env');
const prisma = require('./lib/prisma');

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  ▶ RETROCONSOLE 1981 API online — http://localhost:${env.port}/api/health  [${env.nodeEnv}]\n`);
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
