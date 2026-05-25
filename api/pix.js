// ─── api/pix.js — Vercel Serverless Function (Asaas Sandbox REAL) ────────────

export const config = {
  api: { bodyParser: true },
};

const ASAAS_URL = process.env.ASAAS_URL || 'https://sandbox.asaas.com/api/v3';

// CPF fictício válido para sandbox — o Asaas exige CPF mas no sandbox qualquer um válido serve
const CPF_SANDBOX = '00000000000';

async function getOrCreateCustomer(name, email, apiKey) {
  // 1. Busca cliente existente pelo e-mail
  const search = await fetch(
    `${ASAAS_URL}/customers?email=${encodeURIComponent(email)}&limit=1`,
    { headers: { 'access_token': apiKey, 'User-Agent': 'ValorEmRede/1.0' } }
  );
  const searchData = await search.json();
  if (searchData?.data?.length > 0) return searchData.data[0].id;

  // 2. Cria novo cliente com CPF fictício (obrigatório no Asaas)
  const create = await fetch(`${ASAAS_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'ValorEmRede/1.0',
    },
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: CPF_SANDBOX,
      externalReference: email,
    }),
  });
  const customer = await create.json();
  if (!customer?.id) throw new Error('Falha ao criar cliente: ' + JSON.stringify(customer));
  return customer.id;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ASAAS_API_KEY não configurada' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const { name, email, value, memberId } = body || {};
  if (!name || !email || !value) {
    return res.status(400).json({ error: 'name, email e value são obrigatórios' });
  }

  try {
    // 1. Garante cliente no Asaas
    const customerId = await getOrCreateCustomer(name, email, apiKey);

    // 2. Cria cobrança PIX
    const dueDate = new Date().toISOString().split('T')[0];
    const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
        'User-Agent': 'ValorEmRede/1.0',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: Number(value),
        dueDate,
        description: `Contribuição mensal — ${name}`,
        externalReference: memberId || email,
      }),
    });

    const payment = await paymentRes.json();
    if (!payment?.id) {
      console.error('[PIX] Erro ao criar cobrança:', JSON.stringify(payment));
      return res.status(500).json({ error: 'Falha ao criar cobrança no Asaas', detail: payment });
    }

    // 3. Busca QR Code
    const qrRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
      headers: { 'access_token': apiKey, 'User-Agent': 'ValorEmRede/1.0' },
    });
    const qrData = await qrRes.json();

    return res.status(200).json({
      paymentId: payment.id,
      copyPaste: qrData.payload,
      qrCodeBase64: qrData.encodedImage,
      expiresAt: qrData.expirationDate,
      status: payment.status,
      simulated: false,
    });

  } catch (err) {
    console.error('[PIX] exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
