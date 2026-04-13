import { TrendingUp, TrendingDown, Wallet, Users, Heart, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fmt } from '../utils/format';

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ background: `${color}18`, borderRadius: 10, padding: '0.5rem', display: 'inline-flex' }}>
          <Icon size={20} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: '0.75rem', color: trend >= 0 ? '#059669' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

function CategoryBar({ name, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(value)} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({pct}%)</span></span>
      </div>
      <div className="progress-bar-bg"><div className="progress-bar" style={{ width: `${pct}%`, background: color || 'var(--primary)' }} /></div>
    </div>
  );
}

const CAT_COLORS = ['#059669','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6'];

export default function Dashboard({ totals, categoryBreakdown, memberStats }) {
  const categories = Object.entries(categoryBreakdown || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Painel Financeiro</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Visão geral da associação</p>
      </div>

      <div className="stat-grid-4" style={{ marginBottom: '1.25rem' }}>
        <StatCard icon={TrendingUp} label="Total recebido" value={fmt(totals?.in || 0)} color="#059669" />
        <StatCard icon={TrendingDown} label="Total gasto" value={fmt(totals?.out || 0)} color="#ef4444" />
        <StatCard icon={Wallet} label="Saldo atual" value={fmt(totals?.balance || 0)} color={(totals?.balance || 0) >= 0 ? '#3b82f6' : '#f59e0b'} />
        <StatCard icon={Heart} label="Doações" value={fmt(totals?.donations || 0)} color="#ec4899" />
      </div>

      <div className="dashboard-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart2 size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Gastos por categoria</span>
          </div>
          {categories.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma despesa registrada.</p>
          ) : (
            categories.map(([cat, val], i) => (
              <CategoryBar key={cat} name={cat} value={val} total={totals?.out || 1} color={CAT_COLORS[i % CAT_COLORS.length]} />
            ))
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Membros em dia</span>
          </div>
          {!memberStats || memberStats.total === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum pagamento registrado.</p>
          ) : (
            <>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', textAlign: 'center', margin: '0.5rem 0' }}>
                {memberStats.paid}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/{memberStats.total}</span>
              </div>
              <div className="progress-bar-bg"><div className="progress-bar" style={{ width: `${(memberStats.paid / memberStats.total) * 100}%` }} /></div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                {memberStats.paid} pagaram este mês
              </p>
              {/* Lista de quem pagou */}
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 160, overflowY: 'auto' }}>
                {memberStats.list.map((m) => (
                  <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'var(--surface-alt)' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Wallet size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Resumo financeiro</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', textAlign: 'center' }}>
          {[
            { label: 'Entradas', value: totals?.in || 0, color: '#059669' },
            { label: 'Saídas', value: totals?.out || 0, color: '#ef4444' },
            { label: 'Balanço', value: totals?.balance || 0, color: (totals?.balance || 0) >= 0 ? '#3b82f6' : '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{fmt(value)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
