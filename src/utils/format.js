// ─── src/utils/format.js ─────────────────────────────────────────────────────

export const fmt = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const fmtDateShort = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

export const parseValue = (str) => parseFloat(String(str).replace(/\./g, '').replace(',', '.'));

export const maskMoney = (str) => {
  const only = str.replace(/\D/g, '');
  const num = (parseInt(only || '0', 10) / 100).toFixed(2);
  return num.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseMasked = (str) => parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
