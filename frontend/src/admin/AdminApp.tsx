import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { api, readAuth, saveAuth } from '../api';
import type { Auth } from '../types';
import { AuthModal } from '../components/AuthModal';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminOverview } from './AdminOverview';
import './admin.css';
type Tab = 'overview' | 'products' | 'orders';
export default function AdminApp() {
  const [auth, setAuth] = useState<Auth | null>(readAuth),
    [status, setStatus] = useState<'checking' | 'ready' | 'signed-out' | 'failed'>('checking'),
    [authOpen, setAuthOpen] = useState(!readAuth()),
    [error, setError] = useState(''),
    [tab, setTab] = useState<Tab>('overview'),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!auth) {
      setStatus('signed-out');
      return;
    }
    const c = new AbortController();
    setStatus('checking');
    api<Auth['user']>('/auth/me', { token: auth.accessToken, signal: c.signal })
      .then((user) => {
        const next = { ...auth, user };
        saveAuth(next);
        setAuth(next);
        setStatus('ready');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setStatus('failed');
        }
      });
    return () => c.abort();
  }, [auth?.accessToken]);
  useEffect(() => {
    const expired = () => {
      saveAuth(null);
      setAuth(null);
      setStatus('signed-out');
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('cam-session-expired', expired);
    const timer = auth ? setTimeout(expired, Math.max(0, auth.expiresAt - Date.now())) : undefined;
    return () => {
      window.removeEventListener('cam-session-expired', expired);
      clearTimeout(timer);
    };
  }, [auth?.accessToken]);
  async function logout() {
    if (auth)
      try {
        await api('/auth/logout', { method: 'POST', token: auth.accessToken });
      } catch {}
    saveAuth(null);
    setAuth(null);
    setStatus('signed-out');
    setAuthOpen(false);
    setError('');
  }
  const allowed =
    status === 'ready' && auth && (auth.user.role === 'admin' || auth.user.role === 'staff');
  const navigation = [
    { id: 'overview' as const, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'products' as const, label: 'Sản phẩm', icon: Boxes },
    { id: 'orders' as const, label: 'Đơn hàng', icon: ShoppingBag },
  ];
  if (!allowed)
    return (
      <main className="admin-gate">
        <a className="admin-gate-brand" href="/">
          <ShoppingBag size={34} />
          cam.
        </a>
        <section>
          <span>
            <ShieldCheck size={32} />
          </span>
          <small>CAM · TRUNG TÂM QUẢN TRỊ</small>
          <h1>
            {status === 'checking'
              ? 'Đang xác thực tài khoản…'
              : status === 'ready'
                ? 'Tài khoản chưa có quyền quản trị'
                : 'Không gian quản lý cửa hàng'}
          </h1>
          <p>
            {status === 'checking'
              ? 'Vui lòng chờ trong giây lát.'
              : status === 'ready'
                ? 'Khu vực này chỉ dành cho Admin và Staff. Tài khoản Customer vẫn có thể mua sắm tại gian hàng.'
                : 'Đăng nhập bằng tài khoản Admin hoặc Staff để quản lý sản phẩm và đơn hàng.'}
          </p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          {status !== 'checking' && (
            <button
              className="primary"
              onClick={() => {
                saveAuth(null);
                setAuth(null);
                setAuthOpen(true);
                setError('');
              }}
            >
              Đăng nhập quản trị
              <ArrowUpRight size={17} />
            </button>
          )}
          <a href="/">
            <ArrowLeft size={14} />
            Quay lại gian hàng
          </a>
        </section>
        {authOpen && (
          <AuthModal
            mode="management"
            onClose={() => setAuthOpen(false)}
            onSuccess={(next) => {
              setAuth(next);
              setAuthOpen(false);
              setError('');
            }}
          />
        )}
      </main>
    );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          <span>
            <ShoppingBag size={26} />
          </span>
          cam.<small>QUẢN TRỊ</small>
        </a>
        <p className="admin-nav-label">KHÔNG GIAN LÀM VIỆC</p>
        <nav aria-label="Menu quản trị">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={19} />
              {item.label}
              {tab === item.id && <span />}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-tip">
          <ShieldCheck size={23} />
          <strong>{auth.user.role === 'admin' ? 'Quyền quản trị viên' : 'Quyền nhân viên'}</strong>
          <p>
            {auth.user.role === 'admin'
              ? 'Quản lý sản phẩm, trạng thái bán hàng và đơn hàng của cửa hàng.'
              : 'Thêm, sửa sản phẩm và cập nhật tiến trình đơn hàng.'}
          </p>
        </div>
        <a className="admin-back-store" href="/">
          <Store size={17} />
          Về gian hàng
          <ArrowUpRight size={15} />
        </a>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span>Không gian quản trị</span>
            <i>/</i>
            <strong>{navigation.find((item) => item.id === tab)?.label}</strong>
          </div>
          <div className="admin-profile">
            <span>{auth.user.email.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{auth.user.email}</strong>
              <small>{auth.user.role === 'admin' ? 'Admin' : 'Staff'}</small>
            </div>
            <button title="Đăng xuất" aria-label="Đăng xuất quản trị" onClick={() => void logout()}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="admin-content">
          {tab === 'overview' ? (
            <AdminOverview auth={auth} revision={revision} onNavigate={setTab} />
          ) : tab === 'products' ? (
            <AdminProducts auth={auth} onChanged={() => setRevision((n) => n + 1)} />
          ) : (
            <AdminOrders auth={auth} onChanged={() => setRevision((n) => n + 1)} />
          )}
          <footer className="admin-footer">
            Cam Store · Trung tâm quản trị<span>Dữ liệu được đồng bộ từ cửa hàng</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
