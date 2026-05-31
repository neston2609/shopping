/* eslint-disable no-console */
// Idempotent: ensures the `password_reset` email template exists in production.
// Run once after deploying the forgot-password feature.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function shell(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#0d0420;font-family:'Courier New',monospace;color:#f6f1ff;padding:24px">
  <div style="max-width:600px;margin:0 auto;border:4px solid #ff2e88;background:#1a0b2e;padding:24px">
    <div style="font-size:18px;color:#22d3ff;letter-spacing:2px;border-bottom:3px dashed #2a1450;padding-bottom:12px;margin-bottom:16px">▶ RETROCONSOLE 1981</div>
    <h1 style="font-size:20px;color:#ffcb3c;text-transform:uppercase">${title}</h1>
    ${inner}
    <div style="margin-top:24px;border-top:2px dashed #2a1450;padding-top:12px;font-size:12px;color:#b9a8e0">▲▲▼▼◀▶◀▶ B A START — THANKS FOR PLAYING</div>
  </div></body></html>`;
}

const tpl = {
  key: 'password_reset',
  name: 'Password Reset',
  subject: 'Reset your RETROCONSOLE 1981 password',
  body: shell('Password Reset', `<p>Hi {{customer_name}},</p>
    <p>Someone (hopefully you) asked to reset the password on your RETROCONSOLE 1981 account.</p>
    <p>Click the button below to choose a new password. This link expires in <b style="color:#ffcb3c">{{expires_in}}</b>.</p>
    <p style="text-align:center;margin:22px 0"><a href="{{reset_link}}" style="display:inline-block;background:#a3ff3c;color:#0d0420;padding:14px 28px;font-family:'Press Start 2P','Courier New',monospace;font-size:12px;letter-spacing:2px;border:3px solid #fff;text-decoration:none">▶ RESET PASSWORD</a></p>
    <p style="font-size:12px;color:#b9a8e0">If the button doesn't work, copy this link into your browser:<br/><span style="word-break:break-all">{{reset_link}}</span></p>
    <p style="margin-top:18px">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>`),
};

async function main() {
  await prisma.emailTemplate.upsert({
    where: { key: tpl.key },
    update: { name: tpl.name, subject: tpl.subject, body: tpl.body },
    create: tpl,
  });
  console.log(`✓ Email template "${tpl.key}" is in place.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
