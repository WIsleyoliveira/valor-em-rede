// ─── src/services/amazonPeopleService.js ─────────────────────────────────────
// Simulação realista de integração com Amazon People API

// ── Log persistente de envios automáticos ─────────────────────────────────
const LOG_KEY = 'ver_amazon_people_log';

function saveLog(entry) {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    log.unshift(entry); // mais recente primeiro
    if (log.length > 50) log.splice(50); // máximo 50 registros
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch (_) {}
}

export function getAmazonPeopleLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export async function sendReportToAmazonPeople(payload) {
  // Simula latência de rede real
  await new Promise((r) => setTimeout(r, 1800));

  // Simula falha ocasional (5% chance) para demonstrar tratamento de erro
  if (Math.random() < 0.05) throw new Error('Timeout na API Amazon People');

  const protocol = {
    id: `AP-${Date.now()}`,
    status: 'accepted',
    timestamp: new Date().toISOString(),
    recordsProcessed: payload.summary?.transactions ?? 0,
    hash: Math.random().toString(36).substr(2, 16).toUpperCase(),
  };

  return protocol;
}

export function buildReportPayload(transactions, totals, members, triggeredBy) {
  const byCategory = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category || 'Outros';
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.value);
    });

  return {
    association: 'Valor em Rede',
    generatedAt: new Date().toISOString(),
    triggeredBy: triggeredBy || 'manual',
    period: {
      start: transactions.length ? transactions[transactions.length - 1]?.date : new Date().toISOString(),
      end: new Date().toISOString(),
    },
    summary: {
      totalIn: totals.in,
      totalOut: totals.out,
      balance: totals.balance,
      transactions: transactions.length,
      members: members.length,
    },
    byCategory,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      value: t.value,
      category: t.category || null,
      description: t.desc || t.description || null,
      date: t.date,
      member: t.name || t.memberName || null,
    })),
  };
}

// ── Envio automático disparado a cada ação do gestor ──────────────────────
export async function autoSendToAmazonPeople(transactions, totals, members = [], user, triggerAction = 'manager_action') {
  const payload = buildReportPayload(transactions, totals, members, `${triggerAction} by ${user?.name || 'manager'}`);

  const logEntry = {
    id: `AUTO-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: triggerAction,
    manager: user?.name || 'Gestor',
    status: 'pending',
    recordCount: transactions.length,
  };

  try {
    const protocol = await sendReportToAmazonPeople(payload);
    logEntry.status = 'success';
    logEntry.protocol = protocol.id;
    logEntry.hash = protocol.hash;
  } catch (err) {
    logEntry.status = 'error';
    logEntry.error = err.message;
  }

  saveLog(logEntry);
  return logEntry;
}
