const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound } = require('../../utils/http');
const { render } = require('../../lib/mailer');

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const SUPPORTED_VARS = [
  '{{customer_name}}',
  '{{order_id}}',
  '{{order_total}}',
  '{{order_items}}',
  '{{shipping_address}}',
  '{{tracking_number}}',
];

const list = asyncHandler(async (req, res) => {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { id: 'asc' } });
  res.json({ templates, supportedVariables: SUPPORTED_VARS });
});

const getOne = asyncHandler(async (req, res) => {
  const template = await prisma.emailTemplate.findUnique({ where: { key: req.params.key } });
  if (!template) throw notFound('Template not found');
  res.json({ template, supportedVariables: SUPPORTED_VARS });
});

const update = asyncHandler(async (req, res) => {
  const template = await prisma.emailTemplate.update({ where: { key: req.params.key }, data: req.body });
  res.json({ template });
});

// POST /api/admin/templates/:key/preview  — render with sample data
const preview = asyncHandler(async (req, res) => {
  const template = await prisma.emailTemplate.findUnique({ where: { key: req.params.key } });
  if (!template) throw notFound('Template not found');
  const sample = {
    customer_name: 'Player_1',
    order_id: 'RC81-DEMO1234',
    order_total: '฿179.00',
    order_items: '1x Crystal Quest: Lords of Aether — ฿179.00',
    shipping_address: '123 Pixel Lane, Arcade City, CA 90001, USA',
    tracking_number: 'TRK-998877',
  };
  res.json({ subject: render(template.subject, sample), html: render(template.body, sample) });
});

module.exports = { list, getOne, update, preview, updateSchema, SUPPORTED_VARS };
