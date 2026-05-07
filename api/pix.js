// ─── api/pix.js — Vercel Serverless Function ─────────────────────────────────
// Cria cobrança PIX no Asaas e retorna QR Code + copia-e-cola
// A chave ASAAS_API_KEY fica só no servidor — nunca vai pro browser
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

const ASAAS_URL = process.env.ASAAS_URL || 'https://sandbox.asaas.com/api/v3';

// ── Busca ou cria cliente no Asaas pelo e-mail ────────────────────────────────
async function getOrCreateCustomer(name, email, apiKey) {
  // 1. Tenta buscar cliente existente pelo e-mail
  const search = await fetch(
    `${ASAAS_URL}/customers?email=${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'access_token': apiKey,
        'User-Agent': 'ValorEmRede/1.0',
      },
    }
  );
  const searchData = await search.json();

  if (searchData?.data?.length > 0) {
    return searchData.data[0].id; // cliente já existe
  }

  // 2. Cria novo cliente
  const create = await fetch(`${ASAAS_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'ValorEmRede/1.0',
    },
    body: JSON.stringify({ name, email }),
  });

  const customer = await create.json();
  if (!customer?.id) {
    throw new Error('Falha ao criar cliente no Asaas: ' + JSON.stringify(customer));
  }
  return customer.id;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ASAAS_API_KEY não configurada' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { name, email, value, memberId } = body || {};

  if (!name || !email || !value) {
    return res.status(400).json({ error: 'name, email e value são obrigatórios' });
  }

  try {
    // 1. Garante que o cliente existe no Asaas
    const customerId = await getOrCreateCustomer(name, email, apiKey);

    // 2. Calcula vencimento: hoje + 30 minutos (QR Code PIX expira rápido no sandbox)
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // 3. Cria a cobrança PIX
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
        dueDate: dueDateStr,
        description: `Contribuição mensal — ${name}`,
        externalReference: memberId || email, // liga ao seu sistema
      }),
    });

    const payment = await paymentRes.json();

    if (!payment?.id) {
      console.error('[PIX] Erro ao criar cobrança:', payment);
      return res.status(500).json({ error: 'Falha ao criar cobrança', detail: payment });
    }

    // 4. Busca o QR Code
    const qrRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
      headers: {
        'access_token': apiKey,
        'User-Agent': 'ValorEmRede/1.0',
      },
    });

    const qrData = await qrRes.json();

    return res.status(200).json({
      paymentId: payment.id,
      qrCodeImage: qrData.encodedImage,   // base64 PNG — exibe com <img>
      copyPaste: qrData.payload,           // código copia-e-cola
      expiresAt: qrData.expirationDate,
      status: payment.status,
    });

  } catch (err) {
    console.error('[PIX] exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
}