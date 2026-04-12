// ─── Vercel Serverless Function — proxy seguro para o Groq ──────────────────
// A chave fica no servidor (sem VITE_), nunca vai para o navegador.

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  // CORS — permite chamadas do próprio domínio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Aceita apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  // Garante que o body foi parseado
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const { prompt, temperature = 0.15, max_tokens = 400 } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error('[AI] Groq error:', groqRes.status, err);
      return res.status(groqRes.status).json({ error: err?.error?.message || 'Groq error' });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('[AI] exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
