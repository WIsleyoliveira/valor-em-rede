// ─── src/services/storageService.js ──────────────────────────────────────────

const KEYS = {
  TX: 'ver_transactions',
  MEMBERS: 'ver_members',
  DONATIONS: 'ver_donations',
  PENDING: 'ver_pending',
  PAYMENTS: 'ver_payments',
};

const save = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};

export const storage = {
  getTransactions: () => load(KEYS.TX, []),
  saveTransactions: (data) => save(KEYS.TX, data),

  getMembers: () => load(KEYS.MEMBERS, []),
  saveMembers: (data) => save(KEYS.MEMBERS, data),

  getDonations: () => load(KEYS.DONATIONS, []),
  saveDonations: (data) => save(KEYS.DONATIONS, data),

  getPending: () => load(KEYS.PENDING, []),
  savePending: (data) => save(KEYS.PENDING, data),

  getPayments: () => load(KEYS.PAYMENTS, []),
  savePayments: (data) => save(KEYS.PAYMENTS, data),

  clearAll: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
};
