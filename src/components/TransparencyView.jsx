import { useState } from 'react';
import { Eye, PieChart, Award, TrendingUp, TrendingDown, Heart, Receipt, FileCheck } from 'lucide-react';
import { fmt, fmtDate } from '../utils/format';
import ReceiptModal from './ReceiptModal';

const CAT_COLORS = ['#059669','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6'];

export default function TransparencyView({ transactions, totals, categoryBreakdown, expensesOnly }) {
  const [selected, setSelected] = useState(null);

  const expenses = (transactions || []).filter(t => t.type === 'expense').sort((a,b) => new Date(b.date)-new Date(a.date));
  const payments = (transactions || []).filter(t => t.type === 'payment').sort((a,b) => new Date(b.date)-new Date(a.date));
  const donations = (transactions || []).filter(t => t.type === 'donation').sort((a,b) => new Date(b.date)-new Date(a.date));
  const categories = Object.entries(categoryBreakdown || {}).sort((a,b)=>b[1]-a[1]);

  // Member "Gastos" view — only show expenses with full detail
  if (expensesOnly) return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Receipt size={20} color="var(--primary)" />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Gastos da Associação</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{expenses.length} despesa(s) registrada(s)</p>
        </div>
      </div>
      {selected && <ReceiptModal transaction={selected} onClose={() => setSelected(null)} />}
      {expenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
          <Receipt size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p>Nenhum gasto registrado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {expenses.map(e => (
            <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => setSelected(e)}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Receipt size={18} color="#f59e0b" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.desc}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.category || 'Outros'} · {fmtDate(e.date)}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem', flexShrink: 0 }}>{fmt(e.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Eye size={20} color="var(--primary)" />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Transparência</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Prestação de contas pública</p>
        </div>
      </div>

      {/* Totals */}
      <div className="stat-grid-3" style={{ marginBottom: '1rem' }}>
        {[
          { icon: TrendingUp, label: 'Entradas', value: totals?.in || 0, color: '#059669' },
          { icon: TrendingDown, label: 'Saídas', value: totals?.out || 0, color: '#ef4444' },
          { icon: Heart, label: 'Doações', value: totals?.donations || 0, color: '#ec4899' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ background: color + '18', borderRadius: 10, padding: '0.5rem', display: 'inline-flex', marginBottom: '0.5rem' }}><Icon size={20} color={color} /></div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{fmt(value)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <PieChart size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600 }}>Gastos por categoria</span>
          </div>
          {categories.map(([cat, val], i) => {
            const pct = totals?.out ? Math.round((val / totals.out) * 100) : 0;
            return (
              <div key={cat} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(val)} ({pct}%)</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar" style={{ width: `${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expenses list */}
      {expenses.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Receipt size={16} color="#ef4444" />
            <span style={{ fontWeight: 600 }}>Despesas ({expenses.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {expenses.slice(0,10).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 8, background: 'var(--surface-alt)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.category} — {fmtDate(t.date)}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem', flexShrink: 0 }}>-{fmt(t.value)}</span>
                <button className="btn btn-ghost" style={{ padding: '0.2rem', flexShrink: 0 }} onClick={() => setSelected(t)} title="Ver recibo"><FileCheck size={15} color="var(--text-muted)" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Donations */}
      {donations.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Award size={16} color="#ec4899" />
            <span style={{ fontWeight: 600 }}>Doações ({donations.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {donations.slice(0,8).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 8, background: 'var(--surface-alt)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.anon ? 'Doador anônimo' : t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.cause} — {fmtDate(t.date)}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#ec4899', flexShrink: 0 }}>+{fmt(t.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && <ReceiptModal transaction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
