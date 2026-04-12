import { useState } from 'react';
import { Search, ArrowUpCircle, ArrowDownCircle, Heart, CreditCard, Filter } from 'lucide-react';
import { fmt, fmtDate } from '../utils/format';

const TYPE_CONFIG = {
  payment:  { label: 'Pagamento', color: '#3b82f6', Icon: CreditCard, bg: '#eff6ff' },
  expense:  { label: 'Despesa',   color: '#ef4444', Icon: ArrowDownCircle, bg: '#fef2f2' },
  donation: { label: 'Doação',    color: '#ec4899', Icon: Heart, bg: '#fdf2f8' },
  income:   { label: 'Entrada',   color: '#059669', Icon: ArrowUpCircle, bg: '#f0fdf4' },
};

export default function History({ transactions }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const list = (transactions || []).filter(t => {
    const matchType = filter === 'all' || t.type === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || (t.desc || t.name || t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
    return matchType && matchSearch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Histórico</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{list.length} registro(s) encontrado(s)</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="var(--text-muted)" />
          {[['all','Todos'],['payment','Pagtos.'],['expense','Despesas'],['donation','Doações']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className="btn" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', background: filter === v ? 'var(--primary)' : 'var(--surface)', color: filter === v ? '#fff' : 'var(--text-secondary)', border: `1px solid ${filter === v ? 'var(--primary)' : 'var(--border)'}`, fontWeight: filter === v ? 600 : 400 }}>{l}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <Search size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {list.map(t => {
            const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.income;
            const label = t.desc || t.name || t.description || '—';
            const value = t.value || 0;
            const isOut = t.type === 'expense';
            return (
              <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.Icon size={18} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                    <span className={`badge badge-${t.type === 'payment' ? 'blue' : t.type === 'expense' ? 'red' : t.type === 'donation' ? 'pink' : 'green'}`}>{cfg.label}</span>
                    {t.category && <span className="badge badge-gray">{t.category}</span>}
                    <span>{fmtDate(t.date)}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isOut ? '#ef4444' : '#059669', flexShrink: 0 }}>
                  {isOut ? '-' : '+'}{fmt(value)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
