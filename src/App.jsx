import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CreditCard, Heart, Receipt, History,
  Eye, Upload, Brain, Building2, LogOut
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PaymentForm from './components/PaymentForm';
import DonationForm from './components/DonationForm';
import ExpenseForm from './components/ExpenseForm';
import HistoryView from './components/History';
import TransparencyView from './components/TransparencyView';
import AmazonPeopleExport from './components/AmazonPeopleExport';
import AIRecommendations from './components/AIRecommendations';
import ReceiptModal from './components/ReceiptModal';
import SyncToast from './components/SyncToast';
import { useStore } from './hooks/useStore';
import { useOllama } from './hooks/useOllama';
import { useSync, requestNotificationPermission, sendLocalNotification } from './hooks/useSync';

// Nav configs per role
const MEMBER_NAV = [
  { id: 'payment',      label: 'Pagar',         icon: CreditCard },
  { id: 'donation',     label: 'Doação',         icon: Heart },
  { id: 'history',      label: 'Histórico',      icon: History },
  { id: 'transparency', label: 'Transparência',  icon: Eye },
  { id: 'expenses',     label: 'Gastos',         icon: Receipt },
];
const MANAGER_NAV = [
  { id: 'dashboard',    label: 'Painel',         icon: LayoutDashboard },
  { id: 'expense',      label: 'Despesas',       icon: Receipt },
  { id: 'ai',           label: 'IA',             icon: Brain },
  { id: 'export',       label: 'Exportar',       icon: Upload },
  { id: 'transparency', label: 'Transparência',  icon: Eye },
  { id: 'history',      label: 'Histórico',      icon: History },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [receiptTx, setReceiptTx] = useState(null);
  const { transactions, totals, categoryBreakdown, memberStats, addTransaction, addDonation, addPayment, pending, setPending, setTransactions } = useStore();
  const { status: ollamaStatus, recommendations, loadingRec, fetchRecommendations } = useOllama();
  const { isOnline, syncing, toast, showToast, syncPending } = useSync(pending, setPending, setTransactions);

  // Pede permissão de notificação ao fazer login
  const handleLogin = (u) => {
    setUser(u);
    setPage(u.role === 'manager' ? 'dashboard' : 'payment');
    requestNotificationPermission();
    // Notificação de boas-vindas
    setTimeout(() => {
      sendLocalNotification(
        `Olá, ${u.name}! 👋`,
        u.role === 'manager'
          ? 'Painel do gestor carregado. Dados disponíveis offline.'
          : 'Acesso liberado. Seus dados estão disponíveis.'
      );
    }, 1500);
  };

  // Login gate
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const nav = user.role === 'manager' ? MANAGER_NAV : MEMBER_NAV;
  const activePage = page || nav[0].id;

  const handleAdd = (rec) => {
    if (rec.type === 'payment') addPayment(rec);
    else if (rec.type === 'donation') addDonation(rec);
    else addTransaction(rec);

    // Notificação local de confirmação
    const labels = { payment: 'Pagamento registrado', donation: 'Doação registrada', expense: 'Despesa registrada' };
    const fmt = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
    sendLocalNotification(
      `${labels[rec.type] || 'Registro'} ✓`,
      `${rec.name || rec.desc || 'Item'} — ${fmt(rec.value)}${!isOnline ? ' (salvo offline)' : ''}`
    );

    if (!isOnline) {
      showToast('Salvo localmente. Será sincronizado quando a internet voltar.', 'info');
    }
  };

  const handleAIRefresh = () => fetchRecommendations(transactions, totals);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':   return <Dashboard totals={totals} categoryBreakdown={categoryBreakdown} memberStats={memberStats} />;
      case 'payment':     return <PaymentForm onAdd={handleAdd} onShowReceipt={setReceiptTx} user={user} />;
      case 'donation':    return <DonationForm onAdd={handleAdd} user={user} />;
      case 'expense':     return <ExpenseForm onAdd={handleAdd} onShowReceipt={setReceiptTx} />;
      case 'history':     return <HistoryView transactions={transactions} onShowReceipt={setReceiptTx} />;
      case 'transparency':return <TransparencyView transactions={transactions} totals={totals} categoryBreakdown={categoryBreakdown} />;
      case 'expenses':    return <TransparencyView transactions={transactions} totals={totals} categoryBreakdown={categoryBreakdown} expensesOnly />;
      case 'export':      return <AmazonPeopleExport transactions={transactions} totals={totals} members={[]} user={user} />;
      case 'ai':          return <AIRecommendations recommendations={recommendations} loading={loadingRec} onRefresh={handleAIRefresh} />;
      default:            return <Dashboard totals={totals} categoryBreakdown={categoryBreakdown} memberStats={memberStats} />;
    }
  };

  return (
    <div className="app-shell">
      {receiptTx && <ReceiptModal transaction={receiptTx} onClose={() => setReceiptTx(null)} />}
      <SyncToast toast={syncing ? { msg: 'Sincronizando dados...', type: 'syncing' } : toast} onClose={() => {}} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Valor em Rede</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role === 'manager' ? 'Gestão' : 'Membros'}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.5rem 0' }}>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item${activePage === id ? ' active' : ''}`}
              onClick={() => { setPage(id); setSidebarOpen(false); }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{user.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-start', padding: '0.4rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}
            onClick={() => setUser(null)}
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <Header
          user={user}
          ollamaStatus={ollamaStatus}
          onLogout={() => setUser(null)}
          isOnline={isOnline}
          pendingCount={pending.length}
          syncing={syncing}
          onSyncNow={syncPending}
        />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderPage()}
        </main>

        {/* Mobile bottom nav */}
        <nav className="mobile-nav">
          <div className="mobile-nav-inner">
            {nav.slice(0, 5).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`mobile-nav-item${activePage === id ? ' active' : ''}`}
                onClick={() => setPage(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
