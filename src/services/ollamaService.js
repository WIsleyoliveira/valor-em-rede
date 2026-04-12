// ─── Ollama Service — integração real com llama3.2:3b ──────────────────────
const BASE = 'http://localhost:11434';
const MODEL = 'llama3.2:3b';

export async function checkOllamaStatus() {
  try {
    const res = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false, models: [] };
    const data = await res.json();
    return { online: true, models: data.models?.map(m => m.name) ?? [] };
  } catch { return { online: false, models: [] }; }
}

async function generate(prompt, options = {}) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.15, num_predict: 400, ...options },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return data.response?.trim() ?? '';
}

function extractJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('JSON não encontrado na resposta da IA');
  return JSON.parse(m[0]);
}

// ── Analisa um gasto e retorna JSON estruturado ─────────────────────────────
export async function analisarGasto(descricao, valor) {
  const prompt = `Você é um auditor financeiro de associações comunitárias. Classifique o gasto abaixo.

GASTO: "${descricao}"
VALOR: R$ ${Number(valor).toFixed(2)}

REGRAS DE CATEGORIZAÇÃO (escolha UMA):
- "Transporte" → combustível, frete, passagem, veículo, manutenção de carro/moto
- "Insumos Agrícolas" → sementes, adubo, defensivo, equipamento agrícola, irrigação
- "Administrativo" → material de escritório, impressão, cartório, registro, taxa
- "Manutenção" → reparo, conserto, reforma, instalação, elétrica, hidráulica
- "Alimentação" → alimentos, bebidas, refeição, lanche, coffee break, cesta básica
- "Eventos" → festa, reunião, confraternização, encontro, palestra, som, decoração
- "Saúde" → medicamento, consulta, exame, farmácia, primeiros socorros
- "Educação" → curso, treinamento, livro, material didático, capacitação
- "Infraestrutura" → obra, construção, estrutura, instalação física, terreno
- "Comunicação" → internet, telefone, celular, propaganda, marketing, divulgação
- "Outros" → apenas se não se encaixar em nenhuma acima

Responda APENAS com JSON, sem explicações antes ou depois:
{"categoria":"CATEGORIA_AQUI","subcategoria":"detalhe específico","confianca":0.95,"urgencia":"baixa","resumo":"explicação em 1 frase","recomendacao":"dica prática","alerta":null,"tags":["tag1","tag2"]}`;

  const raw = await generate(prompt, { temperature: 0.05, num_predict: 300 });
  return extractJSON(raw);
}

// ── Gera recomendações financeiras com base no histórico ───────────────────
export async function gerarRecomendacoes(transactions, totals) {
  const despesas = transactions
    .filter(t => t.type === 'expense')
    .slice(0, 15)
    .map(t => `- R$${Number(t.value).toFixed(2)} em ${t.category || 'Outros'}: ${t.desc || t.description || ''}`)
    .join('\n');

  const entradas = transactions
    .filter(t => t.type === 'payment' || t.type === 'donation')
    .slice(0, 10)
    .map(t => `- R$${Number(t.value).toFixed(2)} de ${t.name || t.memberName || 'Membro'}: ${t.desc || t.description || t.method || ''}`)
    .join('\n');

  const prompt = `Você é um consultor financeiro especializado em associações comunitárias brasileiras.
Analise o histórico financeiro abaixo e forneça recomendações práticas e acionáveis.

RESUMO FINANCEIRO:
- Saldo atual: R$ ${totals.balance.toFixed(2)}
- Total recebido: R$ ${totals.in.toFixed(2)}
- Total gasto: R$ ${totals.out.toFixed(2)}
- Percentual gasto: ${totals.in > 0 ? ((totals.out / totals.in) * 100).toFixed(1) : 0}%

ÚLTIMAS ENTRADAS:
${entradas || '(nenhuma entrada registrada)'}

ÚLTIMAS SAÍDAS:
${despesas || '(nenhuma saída registrada)'}

Responda SOMENTE com JSON válido neste formato:
{
  "saude_financeira": "boa ou regular ou critica",
  "score": número de 0 a 100,
  "resumo_executivo": "parágrafo de 2-3 frases sobre a situação financeira",
  "recomendacoes": [
    { "titulo": "string", "descricao": "string de 2 frases", "prioridade": "alta ou media ou baixa", "tipo": "economia ou receita ou gestao ou compliance" },
    { "titulo": "string", "descricao": "string de 2 frases", "prioridade": "alta ou media ou baixa", "tipo": "economia ou receita ou gestao ou compliance" },
    { "titulo": "string", "descricao": "string de 2 frases", "prioridade": "alta ou media ou baixa", "tipo": "economia ou receita ou gestao ou compliance" }
  ],
  "alertas": ["string ou vazio"],
  "proximo_passo": "ação concreta e imediata que a associação deve tomar"
}`;

  const raw = await generate(prompt, { temperature: 0.3, num_predict: 600 });
  return extractJSON(raw);
}

// ── Gera relatório narrativo para exportação ────────────────────────────────
export async function gerarRelatorioNarrativo(transactions, totals, periodo) {
  const catMap = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category || 'Outros'] = (catMap[t.category || 'Outros'] || 0) + Number(t.value);
  });
  const cats = Object.entries(catMap).map(([c, v]) => `${c}: R$${v.toFixed(2)}`).join(', ');

  const inCount = transactions.filter(t => t.type === 'payment' || t.type === 'donation').length;
  const outCount = transactions.filter(t => t.type === 'expense').length;

  const prompt = `Redija um relatório financeiro executivo formal para uma associação comunitária rural brasileira.
Tom: profissional e objetivo. Tamanho: 4-6 parágrafos.

Dados do período ${periodo}:
- Saldo: R$ ${totals.balance.toFixed(2)}
- Receitas: R$ ${totals.in.toFixed(2)} (${inCount} transações)
- Despesas: R$ ${totals.out.toFixed(2)} (${outCount} transações)
- Distribuição de despesas: ${cats || 'sem dados'}

Inclua: análise de desempenho, observações sobre gestão dos recursos, conclusão e perspectiva.`;

  return await generate(prompt, { temperature: 0.4, num_predict: 700 });
}
