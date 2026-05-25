// ─── api/pix.js — Vercel Serverless Function (Asaas Sandbox REAL) ────────────
// Gera cobrança PIX real no Asaas sandbox e retorna QR Code + copia-e-cola
// Variáveis necessárias no Vercel/env:
//   ASAAS_API_KEY  → chave do sandbox (começa com $aact_hmlg_...)
//   ASAAS_URL      → https://sandbox.asaas.com/api/v3
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

const ASAAS_URL = process.env.ASAAS_URL || 'https://sandbox.asaas.com/api/v3';

// ── Busca ou cria cliente no Asaas pelo e-mail ────────────────────────────────
async function getOrCreateCustomer(name, email, apiKey) {
  // 1. Busca cliente existente
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
    return searchData.data[0].id;
  }

  // 2. Cria novo cliente
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
      externalReference: email,
    }),
  });
  const customer = await create.json();
  if (!customer?.id) {
    throw new Error('Falha ao criar cliente no Asaas: ' + JSON.stringify(customer));
  }
  return customer.id;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ASAAS_API_KEY;

  // ── Sem chave: cai no modo mock para desenvolvimento local ────────────────
  if (!apiKey) {
    console.warn('[PIX] ASAAS_API_KEY não configurada — usando mock');
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { name, value } = body || {};
    const paymentId = `pix_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host  = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
    const confirmUrl = `${proto}://${host}/pagar.html?id=${paymentId}&valor=${Number(value||0).toFixed(2)}&nome=${encodeURIComponent(name||'Associado')}`;
    return res.status(200).json({
      paymentId,
      copyPaste: confirmUrl,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: 'PENDING',
      simulated: true,
    });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const { name, email, value, memberId } = body || {};
  if (!name || !email || !value) {
    return res.status(400).json({ error: 'name, email e value são obrigatórios' });
  }

  try {
    // 1. Garante cliente no Asaas
    const customerId = await getOrCreateCustomer(name, email, apiKey);

    // 2. Vencimento = hoje (PIX no sandbox aceita vencimento no dia)
    const dueDate = new Date().toISOString().split('T')[0];

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

    // 4. Busca o QR Code PIX
    const qrRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
      headers: {
        'access_token': apiKey,
        'User-Agent': 'ValorEmRede/1.0',
      },
    });
    const qrData = await qrRes.json();

    return res.status(200).json({
      paymentId: payment.id,
      copyPaste: qrData.payload,          // código copia-e-cola do PIX
      qrCodeBase64: qrData.encodedImage,  // base64 da imagem do QR Code
      expiresAt: qrData.expirationDate,
      status: payment.status,
      simulated: false,
    });

  } catch (err) {
    console.error('[PIX] exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
