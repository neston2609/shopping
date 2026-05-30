/* eslint-disable no-console */
// One-shot migration: if there are no DownloadSource rows yet but the legacy
// SftpSettings singleton has a host, create a "Default" source from it and
// point every DownloadCategory with no sourceId to it.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.downloadSource.count();
  if (existing > 0) {
    console.log(`▶ ${existing} download source(s) already configured — skipping migration.`);
    return;
  }
  const legacy = await prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!legacy || !legacy.host || !legacy.username) {
    console.log('▶ No legacy SFTP settings to migrate — nothing to do.');
    return;
  }
  const src = await prisma.downloadSource.create({
    data: {
      name: 'Default',
      protocol: legacy.protocol || 'sftp',
      enabled: legacy.enabled,
      host: legacy.host,
      port: legacy.port,
      username: legacy.username,
      passwordEnc: legacy.passwordEnc,
      basePath: legacy.basePath,
    },
  });
  console.log(`✓ Created DownloadSource "Default" (id=${src.id}) from legacy SftpSettings.`);

  // Link existing categories
  const linked = await prisma.downloadCategory.updateMany({
    where: { sourceId: null },
    data: { sourceId: src.id },
  });
  console.log(`✓ Linked ${linked.count} existing category(ies) to the Default source.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
