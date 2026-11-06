import { useState, type FormEvent } from 'react';
import { ArrowRight, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { api, saveAuth } from '../api';
import type { Auth } from '../types';
import { Modal } from './Modal';
export function AuthModal({
  onClose,
  onSuccess,
  mode = 'customer',
}: {
  onClose: () => void;
  onSuccess: (auth: Auth) => void;
  mode?: 'customer' | 'management';
}) {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api<{ accessToken: string; expiresIn: number; user: Auth['user'] }>(
        '/auth/' + (register ? 'register' : 'login'),
        { method: 'POST', body: { email: email.trim().toLowerCase(), password } },
      );
      const auth = {
        accessToken: result.accessToken,
        expiresAt: Date.now() + result.expiresIn * 1000,
        user: result.user,
      };
      saveAuth(auth);
      onSuccess(auth);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        mode === 'management'
          ? 'Đăng nhập quản trị'
          : register
            ? 'Tạo tài khoản'
            : 'Chào bạn, mừng trở lại!'
      }
      onClose={onClose}
    >
      <div className="auth-intro">
        <span className="auth-symbol">
          <ShoppingBag size={26} />
        </span>
        <p>
          {mode === 'management' ? (
            <>
              Quản lý sản phẩm, tồn kho và đơn hàng.
              <br />
              Dành cho tài khoản Admin hoặc Staff.
            </>
          ) : (
            <>
              Đăng nhập để lưu giỏ hàng, theo dõi đơn
              <br />
              và tìm món đồ đúng gu cùng Cam.
            </>
          )}
        </p>
      </div>
      <form onSubmit={submit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@example.com"
            maxLength={254}
          />
        </label>
        <label>
          Mật khẩu
          <div className="password-field">
            <input
              type={visible ? 'text' : 'password'}
              required
              minLength={10}
              maxLength={72}
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 10 ký tự"
            />
            <button
              type="button"
              aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
          <ArrowRight size={18} />
        </button>
      </form>
      {mode === 'customer' && (
        <>
          <p className="auth-switch">
            {register ? 'Đã có tài khoản?' : 'Bạn mới ghé Cam?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? 'Đăng nhập' : 'Đăng ký ngay'}
            </button>
          </p>
          <div className="demo-account">
            <strong>Khám phá bằng tài khoản demo</strong>
            <p>demo@example.com · DemoCustomer2026!</p>
            <button
              onClick={() => {
                setEmail('demo@example.com');
                setPassword('DemoCustomer2026!');
                setRegister(false);
                setError('');
              }}
            >
              Điền tài khoản demo <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
      {mode === 'management' && <p className="auth-switch">Quyền quản trị do chủ cửa hàng cấp.</p>}
    </Modal>
  );
}
