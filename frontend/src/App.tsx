import { CouponPicker, CouponShelf } from './components/CouponPicker';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Backpack,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Heart,
  HelpCircle,
  LogOut,
  MessageCircle,
  Minus,
  Package,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { api, ApiError, imageFor, money, readAuth, saveAuth } from './api';
import type {
  Auth,
  Cart,
  ChatMessage,
  ChatReply,
  Order,
  Product,
  Coupon,
  CouponQuote,
} from './types';
import { AuthModal } from './components/AuthModal';
import { Modal } from './components/Modal';
import { ProductCard, ProductImage } from './components/ProductCard';
const emptyCart: Cart = { items: [], total: 0 };
const greeting: ChatMessage = {
  role: 'assistant',
  text: 'Chào bạn, mình là trợ lý Cam! Bạn đang tìm món đồ nào? Cho mình biết nhu cầu và ngân sách, mình sẽ giúp bạn chọn nhé.',
};
const orderLabels: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
};
function readFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem('cam-favorites') || '[]');
  } catch {
    return [];
  }
}
export default function App() {
  const [auth, setAuth] = useState<Auth | null>(readAuth),
    [authOpen, setAuthOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [catalogError, setCatalogError] = useState('');
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [price, setPrice] = useState('all'),
    [sort, setSort] = useState('suggested'),
    [onlyFavorites, setOnlyFavorites] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  useEffect(() => {
    setVisibleCount(12);
  }, [category, price, query, onlyFavorites, sort]);
  const [favorites, setFavorites] = useState<string[]>(readFavorites),
    [selected, setSelected] = useState<Product | null>(null),
    [detailQty, setDetailQty] = useState(1);
  const [cart, setCart] = useState<Cart>(emptyCart),
    [cartOpen, setCartOpen] = useState(false),
    [cartLoading, setCartLoading] = useState(false),
    [cartError, setCartError] = useState(''),
    [mutating, setMutating] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false),
    [orders, setOrders] = useState<Order[]>([]),
    [ordersLoading, setOrdersLoading] = useState(false),
    [ordersError, setOrdersError] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]),
    [couponInput, setCouponInput] = useState(''),
    [couponQuote, setCouponQuote] = useState<CouponQuote | null>(null),
    [couponError, setCouponError] = useState(''),
    [couponBusy, setCouponBusy] = useState(false);
  const couponVersion = useRef(0);
  const categories = useMemo(
    () => [
      { name: 'Tất cả sản phẩm', value: 'all', icon: Grid2X2 },
      ...Array.from(new Set(products.map((p) => p.category)))
        .sort((a, b) => a.localeCompare(b, 'vi'))
        .map((value) => ({
          name: value === 'Balo' ? 'Balo & túi xách' : value === 'Giày' ? 'Giày thể thao' : value,
          value,
          icon: value === 'Balo' ? Backpack : value === 'Giày' ? ShoppingBag : Package,
        })),
    ],
    [products],
  );
  const [checkoutBusy, setCheckoutBusy] = useState(false),
    [completed, setCompleted] = useState<Order | null>(null),
    checkoutKey = useRef<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false),
    [messages, setMessages] = useState<ChatMessage[]>([greeting]),
    [chatInput, setChatInput] = useState(''),
    [chatBusy, setChatBusy] = useState(false);
  const sessionId = useRef<string>(crypto.randomUUID()),
    chatVersion = useRef(0),
    chatEnd = useRef<HTMLDivElement>(null),
    [toast, setToast] = useState(''),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }
  async function loadProducts(signal?: AbortSignal) {
    setLoading(true);
    setCatalogError('');
    try {
      const first = await api<{ items: Product[]; total: number }>('/products?limit=50', {
        signal,
      });
      const items = [...first.items];
      for (let page = 2; items.length < first.total; page++) {
        const next = await api<{ items: Product[] }>('/products?limit=50&page=' + page, { signal });
        if (!next.items.length) break;
        items.push(...next.items);
      }
      setProducts(items);
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setCatalogError('Chưa tải được sản phẩm. Bạn vui lòng thử lại.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void loadProducts(controller.signal);
    api<Coupon[]>('/coupons', { signal: controller.signal })
      .then(setCoupons)
      .catch(() => {
        /* Catalog stays usable if offers are unavailable. */
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCart(emptyCart);
    couponVersion.current++;
    setCouponQuote(null);
    setCouponError('');
    setCouponBusy(false);
    setCartError('');
    chatVersion.current++;
    setChatBusy(false);
    setMessages([greeting]);
    checkoutKey.current = null;
    if (auth) {
      setCartLoading(true);
      api<Cart>('/cart', { token: auth.accessToken, signal: controller.signal })
        .then(setCart)
        .catch((e) => {
          if (e.name !== 'AbortError') setCartError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setCartLoading(false);
        });
      const key = 'cam-chat-session:' + auth.user.id;
      sessionId.current = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, sessionId.current);
    } else {
      setCartLoading(false);
      sessionId.current = crypto.randomUUID();
    }
    return () => controller.abort();
  }, [auth]);
  useEffect(() => {
    const expire = () => {
      saveAuth(null);
      setAuth(null);
      notify('Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại nhé.');
    };
    window.addEventListener('cam-session-expired', expire);
    const timer = auth ? setTimeout(expire, Math.max(0, auth.expiresAt - Date.now())) : undefined;
    return () => {
      window.removeEventListener('cam-session-expired', expire);
      clearTimeout(timer);
    };
  }, [auth]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatBusy, chatOpen]);
  const filtered = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .toLowerCase();
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const result = products.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!onlyFavorites || favorites.includes(p.id)) &&
        (price !== 'under500' || p.price < 500000) &&
        (price !== '500to700' || (p.price >= 500000 && p.price <= 700000)) &&
        (price !== 'over700' || p.price > 700000) &&
        terms.every((term) =>
          normalize([p.name, p.description, ...p.tags].join(' ')).includes(term),
        ),
    );
    // Interleave categories so a large demo catalog is diverse on its first page.
    if (sort === 'suggested') {
      const groups = new Map<string, Product[]>();
      for (const product of result) {
        const group = groups.get(product.category) ?? [];
        group.push(product);
        groups.set(product.category, group);
      }
      const buckets = [...groups.values()];
      const mixed: Product[] = [];
      const longest = Math.max(0, ...buckets.map((group) => group.length));
      for (let index = 0; index < longest; index++)
        for (const group of buckets) if (group[index]) mixed.push(group[index]);
      return mixed;
    }
    if (sort === 'price-up') result.sort((a, b) => a.price - b.price);
    if (sort === 'price-down') result.sort((a, b) => b.price - a.price);
    return result;
  }, [products, category, onlyFavorites, favorites, price, query, sort]);
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('cam-favorites', JSON.stringify(next));
  }
  function openProduct(product: Product) {
    setSelected(product);
    setDetailQty(1);
  }
  function scrollCatalog() {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function chooseCategory(value: string) {
    setCategory(value);
    setOnlyFavorites(false);
    scrollCatalog();
  }
  async function changeCart(product: Product, quantity: number, adding = false) {
    if (!auth) {
      setAuthOpen(true);
      notify('Đăng nhập để thêm món đồ bạn thích vào giỏ nhé.');
      return;
    }
    if (couponBusy || checkoutBusy) return;
    setMutating(true);
    setCartError('');
    try {
      const next = await api<Cart>('/cart/items' + (quantity === 0 ? '/' + product.id : ''), {
        token: auth.accessToken,
        method: quantity === 0 ? 'DELETE' : 'PUT',
        ...(quantity ? { body: { productId: product.id, quantity } } : {}),
      });
      setCart(next);
      couponVersion.current++;
      setCouponQuote(null);
      setCouponError('');
      checkoutKey.current = null;
      if (adding) notify('Đã thêm vào giỏ hàng');
    } catch (e) {
      setCartError((e as Error).message);
      notify((e as Error).message);
    } finally {
      setMutating(false);
    }
  }
  function add(product: Product, quantity = 1) {
    const existing = cart.items.find((i) => i.productId === product.id)?.quantity || 0;
    void changeCart(product, existing + quantity, true);
  }
  async function logout() {
    if (!auth) return;
    try {
      await api('/auth/logout', { method: 'POST', token: auth.accessToken });
    } catch {}
    saveAuth(null);
    setAuth(null);
    setCartOpen(false);
    setOrdersOpen(false);
    notify('Đã đăng xuất');
  }
  async function showOrders() {
    if (!auth) {
      setAuthOpen(true);
      return;
    }
    setOrdersOpen(true);
    setOrdersLoading(true);
    setOrdersError('');
    try {
      setOrders(await api<Order[]>('/orders', { token: auth.accessToken }));
    } catch (e) {
      setOrdersError((e as Error).message);
    } finally {
      setOrdersLoading(false);
    }
  }
  async function applyCoupon(code: string) {
    if (!auth || couponBusy || mutating || checkoutBusy || !code.trim()) return;
    const version = ++couponVersion.current;
    setCouponInput(code.trim().toUpperCase());
    setCouponBusy(true);
    setCouponError('');
    setCouponQuote(null);
    checkoutKey.current = null;
    try {
      const quote = await api<CouponQuote>('/coupons/preview', {
        method: 'POST',
        token: auth.accessToken,
        body: { code: code.trim().toUpperCase() },
      });
      if (version === couponVersion.current) setCouponQuote(quote);
    } catch (e) {
      if (version === couponVersion.current) setCouponError((e as Error).message);
    } finally {
      if (version === couponVersion.current) setCouponBusy(false);
    }
  }
  function removeCoupon() {
    couponVersion.current++;
    setCouponQuote(null);
    setCouponInput('');
    setCouponError('');
    setCouponBusy(false);
    checkoutKey.current = null;
  }
  async function checkout() {
    if (!auth || !cart.items.length || mutating || checkoutBusy || couponBusy) return;
    setCheckoutBusy(true);
    setCartError('');
    checkoutKey.current ??= crypto.randomUUID();
    try {
      const result = await api<Order>('/orders/checkout', {
        method: 'POST',
        token: auth.accessToken,
        body: {
          idempotencyKey: checkoutKey.current,
          ...(couponQuote ? { couponCode: couponQuote.code } : {}),
        },
      });
      setCompleted(result);
      removeCoupon();
      setCart(emptyCart);
      setCartOpen(false);
      checkoutKey.current = null;
      void loadProducts();
    } catch (e) {
      setCartError((e as Error).message);
    } finally {
      setCheckoutBusy(false);
    }
  }
  async function sendChat(text = chatInput) {
    if (!text.trim() || chatBusy) return;
    if (!auth) {
      setAuthOpen(true);
      return;
    }
    const version = chatVersion.current;
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', text: text.trim() }]);
    setChatBusy(true);
    try {
      const result = await api<ChatReply>('/ai/chat', {
        method: 'POST',
        token: auth.accessToken,
        body: { userId: auth.user.id, sessionId: sessionId.current, message: text.trim() },
      });
      if (version === chatVersion.current)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: result.text, products: result.products },
        ]);
    } catch (e) {
      if (version === chatVersion.current)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            error: true,
            text:
              e instanceof ApiError && e.status === 503
                ? 'Trợ lý AI hiện chưa khả dụng. Bạn vẫn có thể tìm kiếm sản phẩm và mua sắm bình thường nhé.'
                : (e as Error).message,
          },
        ]);
    } finally {
      if (version === chatVersion.current) setChatBusy(false);
    }
  }
  function resetChat() {
    chatVersion.current++;
    setChatBusy(false);
    sessionId.current = crypto.randomUUID();
    if (auth) sessionStorage.setItem('cam-chat-session:' + auth.user.id, sessionId.current);
    setMessages([greeting]);
  }
  function searchSubmit(e: FormEvent) {
    e.preventDefault();
    setQuery(search.trim());
    scrollCatalog();
  }
  return (
    <>
      <header className="site-header">
        <div className="utility wrap">
          <span>Những món đồ nhỏ. Niềm vui mỗi ngày.</span>
          <div>
            <button onClick={showOrders}>
              <Package size={13} />
              Đơn hàng của tôi
            </button>
            <span className="utility-divider" />
            <button onClick={() => setChatOpen(true)}>
              <HelpCircle size={13} />
              Cần hỗ trợ?
            </button>
          </div>
        </div>
        <div className="main-header wrap">
          <button
            className="brand"
            aria-label="Cam — Trang chủ"
            onClick={() => {
              setSearch('');
              setQuery('');
              setCategory('all');
              setPrice('all');
              setOnlyFavorites(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="brand-icon">
              <ShoppingBag size={28} strokeWidth={1.7} />
            </span>
            cam<span className="brand-dot">.</span>
          </button>
          <div className="search-area">
            <form className="search-form" onSubmit={searchSubmit}>
              <Search size={20} />
              <input
                aria-label="Tìm kiếm sản phẩm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hôm nay bạn đang tìm gì?"
              />
              <button aria-label="Tìm kiếm" type="submit">
                <Search size={21} />
              </button>
            </form>
            <div className="search-suggestions">
              {['Giày thể thao', 'Balo đi làm', 'Dưới 500k'].map((text, i) => (
                <button
                  key={text}
                  onClick={() => {
                    if (i === 2) {
                      setPrice('under500');
                      setQuery('');
                      setSearch('');
                    } else {
                      setSearch(i === 0 ? 'giày' : 'balo');
                      setQuery(i === 0 ? 'giày' : 'balo');
                    }
                    setCategory('all');
                    scrollCatalog();
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
          <div className="header-actions">
            {auth && ['admin', 'staff'].includes(auth.user.role) && (
              <a className="store-admin-link" href="/admin">
                Quản trị
                <ArrowUpRight size={15} />
              </a>
            )}
            <button
              className="account-button"
              onClick={() => (auth ? void showOrders() : setAuthOpen(true))}
            >
              <UserRound size={24} />
              <span>
                <small>{auth ? 'Xin chào bạn' : 'Chào mừng bạn'}</small>
                <strong>{auth ? auth.user.email.split('@')[0] : 'Đăng nhập'}</strong>
              </span>
            </button>
            <span className="header-divider" />
            <button
              className="header-cart"
              aria-label={'Giỏ hàng, ' + cartCount + ' sản phẩm'}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart size={27} />
              <span className="cart-count">{cartCount}</span>
            </button>
            {auth && (
              <button className="logout-button" aria-label="Đăng xuất" onClick={logout}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </header>
      <nav className="main-nav">
        <div className="wrap nav-inner">
          <button
            className={category === 'all' && !onlyFavorites ? 'nav-active' : ''}
            onClick={() => chooseCategory('all')}
          >
            <Grid2X2 size={17} />
            Tất cả sản phẩm
          </button>
          <button
            className={category === 'Giày' ? 'nav-active' : ''}
            onClick={() => chooseCategory('Giày')}
          >
            Giày thể thao
          </button>
          <button
            className={category === 'Balo' ? 'nav-active' : ''}
            onClick={() => chooseCategory('Balo')}
          >
            Balo & túi xách
          </button>
          <button
            className={onlyFavorites ? 'nav-active' : ''}
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              scrollCatalog();
            }}
          >
            <Heart size={16} />
            Yêu thích
            {favorites.length > 0 && <span className="nav-counter">{favorites.length}</span>}
          </button>
          <span className="nav-spacer" />
          <button className="nav-ai" onClick={() => setChatOpen(true)}>
            <Sparkles size={16} />
            Tìm đúng gu cùng AI
            <ArrowUpRight size={14} />
          </button>
        </div>
      </nav>
      <main className="wrap">
        <div className="breadcrumb">
          <span>Trang chủ</span>
          <ChevronRight size={12} />
          <span>Khám phá cùng Cam</span>
        </div>
        <section className="hero-grid" aria-label="Khám phá mua sắm">
          <div className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <span />
                CHỌN CHẤT RIÊNG, SỐNG ĐÚNG GU
              </span>
              <h1>
                Món đồ đúng gu.
                <br />
                Mỗi ngày thêm vui.
              </h1>
              <p>
                Từ đôi giày bạn thích đến chiếc balo đồng hành.
                <br className="desktop-break" /> Khám phá những lựa chọn vừa vặn với bạn.
              </p>
              <button className="hero-cta" onClick={() => chooseCategory('all')}>
                Khám phá ngay
                <ArrowRight size={19} />
              </button>
              <div className="hero-footnote">
                <span className="mini-line" />
                Đơn giản hơn. Hợp với bạn hơn.
              </div>
            </div>
            <div className="hero-visual">
              <img
                src="/images/hero.jpg"
                alt="Giày thể thao màu đỏ trên phông đỏ — ảnh minh họa phong cách"
              />
              <span className="hero-circle" />
              <span className="hero-image-label">
                EVERYDAY
                <br />
                <strong>ESSENTIALS.</strong>
              </span>
              <span className="floating-tag">
                <ShoppingBag size={16} />
                Một chút mới, một ngày vui.
              </span>
            </div>
          </div>
          <aside className="ai-promo">
            <div className="ai-promo-top">
              <span className="ai-icon">
                <Sparkles size={24} />
              </span>
              <span className="small-tag">TRỢ LÝ MUA SẮM</span>
            </div>
            <h2>
              Chưa biết chọn gì?
              <br />
              Để Cam giúp bạn.
            </h2>
            <p>
              Kể một chút về nhu cầu,
              <br />
              tìm lựa chọn phù hợp với bạn.
            </p>
            <div className="sample-bubble">
              “Giày nam dưới 700k?”
              <span>
                <Sparkles size={12} />
              </span>
            </div>
            <button
              onClick={() => {
                setChatOpen(true);
                setChatInput('Tôi muốn tìm giày nam dưới 700 nghìn');
              }}
            >
              Hỏi trợ lý AI
              <ArrowUpRight size={18} />
            </button>
          </aside>
        </section>
        <section className="benefit-strip" aria-label="Trải nghiệm mua sắm">
          <div>
            <span>
              <ShoppingBag size={23} />
            </span>
            <p>
              <strong>Lựa chọn rõ ràng</strong>
              <small>Giá và thông tin minh bạch</small>
            </p>
          </div>
          <div>
            <span>
              <ShieldCheck size={24} />
            </span>
            <p>
              <strong>Mua sắm an tâm</strong>
              <small>Kiểm tra tồn kho khi đặt hàng</small>
            </p>
          </div>
          <div>
            <span>
              <Sparkles size={23} />
            </span>
            <p>
              <strong>Tư vấn theo nhu cầu</strong>
              <small>Tìm sản phẩm hợp với bạn</small>
            </p>
          </div>
          <div>
            <span>
              <Package size={24} />
            </span>
            <p>
              <strong>Dễ dàng theo dõi</strong>
              <small>Giỏ hàng và đơn hàng của bạn</small>
            </p>
          </div>
        </section>
        <section className="category-discovery" aria-label="Khám phá danh mục">
          {categories.map((item) => (
            <button
              key={item.value}
              className={category === item.value ? 'active' : ''}
              onClick={() => chooseCategory(item.value)}
            >
              <item.icon size={22} />
              <strong>{item.name}</strong>
              <small>
                {products.filter((p) => item.value === 'all' || p.category === item.value).length}{' '}
                sản phẩm
              </small>
            </button>
          ))}
        </section>
        <CouponShelf
          coupons={coupons}
          onChoose={(code) => {
            setCouponInput(code);
            setCartOpen(true);
          }}
        />
        <section id="catalog" className="catalog">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">MỘT CHÚT CẢM HỨNG CHO BẠN</span>
              <h2>
                {onlyFavorites ? 'Những món bạn yêu thích' : 'Khám phá sản phẩm'}
                <span className="orange-dot" />
              </h2>
            </div>
            <span className="catalog-count">
              {loading ? 'Đang tải…' : filtered.length + ' lựa chọn dành cho bạn'}
            </span>
          </div>
          <div className="catalog-layout">
            <aside className="filters">
              <div className="filter-title">
                <SlidersHorizontal size={17} />
                <strong>Bộ lọc tìm kiếm</strong>
              </div>
              <div className="filter-group">
                <h3>Danh mục</h3>
                {categories.map((item) => (
                  <button
                    className={category === item.value ? 'category-active' : ''}
                    key={item.value}
                    onClick={() => {
                      setCategory(item.value);
                      setOnlyFavorites(false);
                    }}
                  >
                    <item.icon size={17} />
                    <span>{item.name}</span>
                    <small>
                      {
                        products.filter((p) => item.value === 'all' || p.category === item.value)
                          .length
                      }
                    </small>
                  </button>
                ))}
              </div>
              <div className="filter-group price-group">
                <h3>Khoảng giá</h3>
                {[
                  { value: 'all', label: 'Tất cả mức giá' },
                  { value: 'under500', label: 'Dưới 500.000đ' },
                  { value: '500to700', label: '500.000đ – 700.000đ' },
                  { value: 'over700', label: 'Trên 700.000đ' },
                ].map((item) => (
                  <label key={item.value}>
                    <input
                      type="radio"
                      name="price"
                      value={item.value}
                      checked={price === item.value}
                      onChange={() => setPrice(item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <button
                className="reset-filters"
                onClick={() => {
                  setPrice('all');
                  setCategory('all');
                  setQuery('');
                  setSearch('');
                  setOnlyFavorites(false);
                }}
              >
                Xóa bộ lọc
              </button>
              <div className="filter-tip">
                <Sparkles size={20} />
                <strong>Tìm món đồ “chân ái”</strong>
                <p>Nói với Cam về phong cách và ngân sách của bạn.</p>
                <button onClick={() => setChatOpen(true)}>
                  Thử trò chuyện
                  <ArrowRight size={14} />
                </button>
              </div>
            </aside>
            <div className="catalog-content">
              <div className="sort-bar">
                <div className="catalog-tabs">
                  <button
                    className={!onlyFavorites ? 'selected-tab' : ''}
                    onClick={() => setOnlyFavorites(false)}
                  >
                    Dành cho bạn
                  </button>
                  <button
                    className={onlyFavorites ? 'selected-tab' : ''}
                    onClick={() => setOnlyFavorites(true)}
                  >
                    Đã yêu thích
                  </button>
                </div>
                <label className="sort-select">
                  <span>Sắp xếp:</span>
                  <select
                    aria-label="Sắp xếp sản phẩm"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="suggested">Gợi ý cho bạn</option>
                    <option value="price-up">Giá: thấp đến cao</option>
                    <option value="price-down">Giá: cao đến thấp</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              {query && (
                <div className="query-line">
                  Kết quả cho “{query}”
                  <button
                    aria-label="Xóa từ khóa"
                    onClick={() => {
                      setQuery('');
                      setSearch('');
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {loading ? (
                <div className="product-grid">
                  {[1, 2, 3].map((i) => (
                    <div className="skeleton-card" key={i}>
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              ) : catalogError ? (
                <div className="empty-state">
                  <Package size={40} />
                  <h3>{catalogError}</h3>
                  <button className="primary" onClick={() => void loadProducts()}>
                    Thử lại
                  </button>
                </div>
              ) : filtered.length ? (
                <div className="product-grid">
                  {filtered.slice(0, visibleCount).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      favorite={favorites.includes(product.id)}
                      onFavorite={() => toggleFavorite(product.id)}
                      onOpen={() => openProduct(product)}
                      onAdd={() => add(product)}
                      busy={mutating || checkoutBusy}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={40} />
                  <h3>
                    {onlyFavorites ? 'Chưa có món đồ yêu thích' : 'Chưa tìm thấy sản phẩm phù hợp'}
                  </h3>
                  <p>
                    {onlyFavorites
                      ? 'Bấm trái tim trên sản phẩm để lưu lại nhé.'
                      : 'Thử đổi từ khóa hoặc điều chỉnh bộ lọc nhé.'}
                  </p>
                  <button
                    className="outline"
                    onClick={() => {
                      setQuery('');
                      setSearch('');
                      setCategory('all');
                      setPrice('all');
                      setOnlyFavorites(false);
                    }}
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              )}
              {visibleCount < filtered.length && (
                <button className="load-more" onClick={() => setVisibleCount((n) => n + 12)}>
                  Xem thêm {Math.min(12, filtered.length - visibleCount)} sản phẩm{' '}
                  <ArrowRight size={16} />
                </button>
              )}
              <div className="catalog-bottom">
                <span>
                  <CheckCircle2 size={15} />
                  {Math.min(visibleCount, filtered.length)} / {filtered.length} sản phẩm
                </span>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Về đầu trang
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="bottom-banner">
          <span className="bottom-logo">
            <ShoppingBag size={31} />
          </span>
          <div>
            <h2>Ít đắn đo hơn. Thêm đúng gu.</h2>
            <p>Một cuộc trò chuyện nhỏ, một lựa chọn hợp với bạn.</p>
          </div>
          <button onClick={() => setChatOpen(true)}>
            Tìm món đồ của bạn
            <Sparkles size={17} />
          </button>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <span className="footer-brand">cam.</span>
            <span>Mua sắm đúng gu, mỗi ngày.</span>
          </div>
          <p>© {new Date().getFullYear()} Cam Store · Bản trải nghiệm</p>
          <button onClick={showOrders}>
            Đơn hàng của bạn
            <ArrowUpRight size={14} />
          </button>
        </div>
      </footer>
      {!chatOpen && (
        <button className="chat-launcher" onClick={() => setChatOpen(true)}>
          <span className="chat-launcher-icon">
            <MessageCircle size={23} />
            <i />
          </span>
          <span>
            Cam ở đây!<small>Cùng tìm món đồ bạn thích</small>
          </span>
          <ChevronRight size={16} />
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button aria-label="Đóng thông báo" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={(result) => {
            setAuth(result);
            setAuthOpen(false);
            notify('Chào mừng bạn đến với Cam!');
          }}
        />
      )}
      {selected && (
        <Modal title="Chi tiết sản phẩm" wide onClose={() => setSelected(null)}>
          <div className="detail-layout">
            <div className="detail-image">
              <ProductImage product={selected} />
              <small>Ảnh minh họa sản phẩm</small>
            </div>
            <div className="detail-copy">
              <span className="section-eyebrow">{selected.category}</span>
              <h2>{selected.name}</h2>
              <strong className="detail-price">{money(selected.price)}</strong>
              <p>{selected.description}</p>
              <div className="tag-list">
                {selected.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="stock-text">
                <i />
                Còn {selected.stock} sản phẩm
              </div>
              <div className="quantity">
                <span>Số lượng</span>
                <div>
                  <button
                    disabled={detailQty <= 1}
                    onClick={() => setDetailQty((q) => q - 1)}
                    aria-label="Giảm số lượng"
                  >
                    <Minus size={15} />
                  </button>
                  <strong>{detailQty}</strong>
                  <button
                    disabled={detailQty >= Math.min(1000, selected.stock)}
                    onClick={() => setDetailQty((q) => q + 1)}
                    aria-label="Tăng số lượng"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <button
                className="primary full"
                disabled={mutating || selected.stock < 1}
                onClick={() => add(selected, detailQty)}
              >
                <ShoppingBag size={18} />
                {mutating ? 'Đang thêm…' : 'Thêm vào giỏ hàng'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {cartOpen && (
        <Modal
          title={'Giỏ hàng của bạn' + (cartCount ? ' (' + cartCount + ')' : '')}
          wide
          onClose={() => setCartOpen(false)}
        >
          {!auth ? (
            <div className="empty-state">
              <ShoppingBag size={46} />
              <h3>Giỏ hàng đang chờ bạn</h3>
              <p>Đăng nhập để lưu những món đồ bạn thích.</p>
              <button
                className="primary"
                onClick={() => {
                  setCartOpen(false);
                  setAuthOpen(true);
                }}
              >
                Đăng nhập ngay
                <ArrowRight size={17} />
              </button>
            </div>
          ) : cartLoading ? (
            <div className="loading-state">Đang tải giỏ hàng…</div>
          ) : (
            <>
              <div className="cart-items">
                {cart.items.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-thumb">
                      <ProductImage product={item.product} />
                    </div>
                    <div className="cart-item-copy">
                      <h3>{item.product.name}</h3>
                      <span>{money(item.product.price)}</span>
                      <div className="quantity-controls">
                        <button
                          disabled={mutating || checkoutBusy || couponBusy || item.quantity <= 1}
                          onClick={() => void changeCart(item.product, item.quantity - 1)}
                          aria-label={'Giảm số lượng ' + item.product.name}
                        >
                          <Minus size={14} />
                        </button>
                        <strong>{item.quantity}</strong>
                        <button
                          disabled={
                            mutating ||
                            checkoutBusy ||
                            couponBusy ||
                            item.quantity >= Math.min(item.product.stock, 1000)
                          }
                          onClick={() => void changeCart(item.product, item.quantity + 1)}
                          aria-label={'Tăng số lượng ' + item.product.name}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-end">
                      <strong>{money(item.product.price * item.quantity)}</strong>
                      <button
                        className="icon-button"
                        disabled={mutating || checkoutBusy || couponBusy}
                        aria-label={'Xóa ' + item.product.name}
                        onClick={() => void changeCart(item.product, 0)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {!cart.items.length && (
                <div className="empty-state">
                  <ShoppingBag size={44} />
                  <h3>Giỏ hàng còn trống</h3>
                  <p>Cùng khám phá một món đồ mới nhé.</p>
                  <button
                    className="outline"
                    onClick={() => {
                      setCartOpen(false);
                      scrollCatalog();
                    }}
                  >
                    Tiếp tục mua sắm
                  </button>
                </div>
              )}
              {cartError && (
                <p className="error-text" role="alert">
                  {cartError}
                </p>
              )}
              {cart.items.length > 0 && (
                <div className="cart-summary">
                  <div>
                    <span>Tổng tiền sản phẩm</span>
                    <strong>{money(cart.total)}</strong>
                  </div>
                  <CouponPicker
                    input={couponInput}
                    onInput={setCouponInput}
                    coupons={coupons}
                    quote={couponQuote}
                    busy={couponBusy}
                    disabled={mutating || checkoutBusy || couponBusy}
                    error={couponError}
                    onApply={(code) => void applyCoupon(code)}
                    onRemove={removeCoupon}
                  />
                  {couponQuote && (
                    <>
                      <div className="discount-row">
                        <span>Giảm giá ({couponQuote.code})</span>
                        <strong>−{money(couponQuote.discount)}</strong>
                      </div>
                      <div className="payable-row">
                        <span>Thành tiền</span>
                        <strong>{money(couponQuote.total)}</strong>
                      </div>
                    </>
                  )}
                  <p>
                    Đơn hàng được xác nhận khi đặt. Chưa thu tiền trực tuyến; chưa bao gồm phí vận
                    chuyển hoặc thuế bổ sung.
                  </p>
                  <button
                    className="primary full"
                    disabled={mutating || checkoutBusy || couponBusy}
                    onClick={() => void checkout()}
                  >
                    {checkoutBusy ? 'Đang xác nhận đơn…' : 'Xác nhận đặt hàng'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
      {completed && (
        <Modal title="Đặt hàng thành công" onClose={() => setCompleted(null)}>
          <div className="order-success">
            <span>
              <Check size={35} />
            </span>
            <h2>Món đồ mới đang chờ bạn!</h2>
            <p>
              Đơn hàng đã được xác nhận.
              <br />
              Đơn này chưa được thanh toán trực tuyến.
            </p>
            <div>
              <small>MÃ ĐƠN HÀNG</small>
              <code>{completed.id}</code>
              <strong>{money(completed.total)}</strong>
              {completed.couponCode && (
                <small>
                  Đã giảm {money(completed.discount)} với mã {completed.couponCode}
                </small>
              )}
            </div>
            <button
              className="primary full"
              onClick={() => {
                setCompleted(null);
                void showOrders();
              }}
            >
              Xem đơn hàng
              <ArrowRight size={17} />
            </button>
          </div>
        </Modal>
      )}
      {ordersOpen && (
        <Modal title="Đơn hàng của bạn" wide onClose={() => setOrdersOpen(false)}>
          {ordersLoading ? (
            <div className="loading-state">Đang tải đơn hàng…</div>
          ) : ordersError ? (
            <p className="error-text" role="alert">
              {ordersError}
            </p>
          ) : orders.length ? (
            <div className="orders-list">
              {orders.map((order) => (
                <article key={order.id}>
                  <div className="order-head">
                    <small>
                      #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </small>
                    <span>{orderLabels[order.status] || order.status}</span>
                  </div>
                  {order.items.map((item) => (
                    <div className="order-line" key={item.productId}>
                      <div>
                        <strong>{item.productName}</strong>
                        <small>Số lượng: {item.quantity}</small>
                      </div>
                      <span>{money(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                  {order.couponCode && (
                    <div className="order-coupon">
                      Mã {order.couponCode} · Đã giảm {money(order.discount)}
                    </div>
                  )}
                  <div className="order-total">
                    Tổng tiền<strong>{money(order.total)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Package size={44} />
              <h3>Chưa có đơn hàng nào</h3>
              <p>Món đồ đầu tiên của bạn đang đợi được khám phá.</p>
              <button
                className="primary"
                onClick={() => {
                  setOrdersOpen(false);
                  scrollCatalog();
                }}
              >
                Khám phá sản phẩm
              </button>
            </div>
          )}
        </Modal>
      )}
      {chatOpen && (
        <section className="chat-panel" aria-label="Trợ lý mua sắm Cam">
          <header>
            <span className="chat-avatar">
              <Sparkles size={23} />
            </span>
            <div>
              <strong>Cam · Trợ lý mua sắm</strong>
              <small>Cùng bạn tìm món đồ đúng gu</small>
            </div>
            <button
              onClick={resetChat}
              className="chat-new"
              disabled={chatBusy}
              title="Cuộc trò chuyện mới"
              aria-label="Cuộc trò chuyện mới"
            >
              <MessageCircle size={18} />
            </button>
            <button aria-label="Đóng chat" onClick={() => setChatOpen(false)}>
              <X size={21} />
            </button>
          </header>
          <div className="chat-messages">
            <p className="chat-date">Hôm nay · Cùng khám phá nhé</p>
            {messages.map((message, i) => (
              <div
                className={'chat-message ' + message.role + (message.error ? ' chat-error' : '')}
                key={i}
              >
                {message.role === 'assistant' && (
                  <span className="message-avatar">
                    <Sparkles size={14} />
                  </span>
                )}
                <div>
                  <p>{message.text}</p>
                  {message.products?.map((p) => (
                    <button className="chat-product" key={p.id} onClick={() => openProduct(p)}>
                      {imageFor(p) && <ProductImage product={p} />}
                      <span>
                        <strong>{p.name}</strong>
                        <small>{money(p.price)}</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div className="chat-thinking">
                <span />
                <span />
                <span />
                <small>Cam đang tìm lựa chọn cho bạn…</small>
              </div>
            )}
            {messages.length === 1 && (
              <div className="chat-prompts">
                {['Giày nam dưới 700 nghìn', 'Tìm balo đi làm dưới 500k'].map((text) => (
                  <button key={text} onClick={() => void sendChat(text)}>
                    {text}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            )}
            <div ref={chatEnd} />
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void sendChat();
            }}
          >
            <input
              aria-label="Tin nhắn cho trợ lý AI"
              value={chatInput}
              maxLength={2000}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={auth ? 'Bạn đang tìm món đồ nào?' : 'Đăng nhập để trò chuyện cùng Cam'}
              disabled={chatBusy}
            />
            <button aria-label="Gửi tin nhắn" disabled={chatBusy || !chatInput.trim()}>
              <Send size={18} />
            </button>
          </form>
          <p className="chat-disclaimer">
            AI có thể nhầm lẫn. Hãy kiểm tra thông tin trên sản phẩm.
          </p>
        </section>
      )}
    </>
  );
}
function PlusIcon() {
  return (
    <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
      +
    </span>
  );
}
