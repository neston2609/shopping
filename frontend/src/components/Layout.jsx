import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// Admin app lives at /admin/ behind nginx in prod; override for local dev.
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || '/admin/';

// `key` identifies which single item is active (NavLink can't tell these apart
// because they all resolve to the same /shop path, ignoring the query string).
const NAV_FALLBACK = [
  { label: 'HOME', sub: 'main quest', to: '/', key: 'home' },
  { label: 'CONSOLES', sub: 'level 1-99', to: '/shop?category=consoles', key: 'cat:consoles' },
  { label: 'GAMES', sub: 'cartridges', to: '/shop?category=games', key: 'cat:games' },
  { label: 'CONTROLLERS', sub: 'weapons', to: '/shop?category=controllers', key: 'cat:controllers' },
  { label: 'ACCESSORIES', sub: 'side gear', to: '/shop?category=accessories', key: 'cat:accessories' },
  { label: 'MERCH', sub: 'cosmetics', to: '/shop?category=apparel', key: 'cat:apparel' },
  { label: 'DEALS', sub: 'bonus stage', to: '/shop?sort=price_asc', key: 'deals' },
  { label: 'DOWNLOADS', sub: 'files', to: '/downloads', key: 'downloads' },
  { label: 'SHOP', sub: 'all loot', to: '/shop', key: 'shop' },
];

// Derive the single active nav key from the current location.
function activeNavKey(pathname, searchStr) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/downloads')) return 'downloads';
  if (pathname.startsWith('/shop')) {
    const sp = new URLSearchParams(searchStr);
    const cat = sp.get('category');
    if (cat) return `cat:${cat}`;
    if (sp.get('sort') === 'price_asc') return 'deals';
    return 'shop';
  }
  return null;
}

function Logo() {
  return (
    <Link className="logo" to="/">
      <div className="mark" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 8 8" shapeRendering="crispEdges">
          <rect width="8" height="8" fill="#000" />
          <g fill="#ff2e88">
            <rect x="1" y="1" width="5" height="1" />
            <rect x="1" y="2" width="1" height="5" />
            <rect x="2" y="2" width="3" height="1" />
            <rect x="5" y="3" width="1" height="1" />
            <rect x="2" y="4" width="3" height="1" />
          </g>
          <g fill="#22d3ff">
            <rect x="6" y="1" width="1" height="1" />
            <rect x="6" y="3" width="1" height="1" />
          </g>
        </svg>
      </div>
      <div className="name">
        RETROCONSOLE<small>// 1981 · RETRO GAME EMPORIUM</small>
      </div>
    </Link>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [promo, setPromo] = useState({ enabled: false, threshold: 0 });
  const [lineChat, setLineChat] = useState({ embed: '', basicId: '' });
  const activeKey = activeNavKey(location.pathname, location.search);

  useEffect(() => {
    api.get('/shipping-methods').then((d) => setPromo(d.freeShipping || { enabled: false, threshold: 0 })).catch(() => {});
    api
      .get('/store-settings')
      .then((d) => setLineChat({ embed: d.lineChatEmbed || '', basicId: d.lineBasicId || '' }))
      .catch(() => {});
  }, []);

  // Inject the LINE Chat Plugin embed once per page-load (admin pastes the raw
  // snippet LINE OA Manager hands them; we parse it so <script> tags actually
  // execute — innerHTML alone would just paint inert text). Customer replies
  // are handled in LINE OA Manager, so no extra plumbing here.
  useEffect(() => {
    if (!lineChat.embed || window.__lineChatLoaded) return undefined;
    window.__lineChatLoaded = true;
    try {
      const host = document.createElement('div');
      host.id = 'line-chat-embed-host';
      host.style.position = 'relative';
      host.style.zIndex = '99999';
      const parsed = new DOMParser().parseFromString(lineChat.embed, 'text/html');
      for (const node of Array.from(parsed.body.childNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') {
          const s = document.createElement('script');
          for (const { name, value } of node.attributes) s.setAttribute(name, value);
          if (!node.src) s.text = node.textContent || '';
          document.body.appendChild(s);
        } else {
          host.appendChild(node.cloneNode(true));
        }
      }
      document.body.appendChild(host);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to inject LINE chat embed:', e);
    }
    return () => { /* keep mounted across route changes */ };
  }, [lineChat.embed]);

  // Fallback: when no embed snippet is set but a Basic ID is — render our own
  // floating LINE-green bubble. Opens line.me/R/ti/p/<basicId>, which works on
  // every LINE OA (no Chat Plugin enablement needed).
  const showCustomLineButton = !lineChat.embed && lineChat.basicId;
  const lineDeepLink = showCustomLineButton ? `https://line.me/R/ti/p/${encodeURIComponent(lineChat.basicId)}` : null;

  const promoText = promo.enabled && promo.threshold > 0
    ? `FREE SHIPPING ON ORDERS OVER ฿${Number(promo.threshold).toLocaleString()}`
    : 'LVL UP YOUR INBOX FOR -15%';

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="page">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="left">
          <div className="ticker">
            <span className="dot" />SHIPPING ONLINE · WORLDWIDE QUEST AVAILABLE · {promoText}
          </div>
        </div>
        <div className="right">
          <span className="pill">EN · THB</span>
          {user ? (
            <>
              {user.role === 'admin' && (
                <a className="pill" href={ADMIN_URL} style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>⚙ ADMIN</a>
              )}
              <Link className="pill" to="/orders" style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>MY ORDERS</Link>
              <Link className="pill" to="/account">{(user.firstName || 'PLAYER').toUpperCase()}</Link>
              <span className="pill" style={{ color: 'var(--lime)', borderColor: 'var(--lime)' }} onClick={logout}>SIGN OUT</span>
            </>
          ) : (
            <>
              <Link className="pill" to="/login">SIGN IN</Link>
              <Link className="pill" to="/register" style={{ color: 'var(--lime)', borderColor: 'var(--lime)' }}>JOIN GUILD</Link>
            </>
          )}
        </div>
      </div>

      {/* HEADER */}
      <div className="header">
        <Logo />
        <form className="search" onSubmit={submitSearch}>
          <div className="prompt">SEARCH&gt;</div>
          <input
            type="text"
            placeholder="enter cheat code or item name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="go" type="submit">ENTER</button>
        </form>
        <div className="headstats">
          <div className="coin" title="Your loot wallet">
            <div className="c">฿</div>
            <div className="v">{(user?.coins ?? 0).toLocaleString()}</div>
          </div>
          <Link className="cart" to="/cart">
            BAG · {cart.count}
            <span className="badge">{cart.count}</span>
          </Link>
        </div>
      </div>

      {/* NAV */}
      <div className="nav">
        {NAV_FALLBACK.map((n) => (
          <Link key={n.label} to={n.to} className={n.key === activeKey ? 'active' : ''}>
            {n.label}
            <span>{n.sub}</span>
          </Link>
        ))}
      </div>

      <Outlet />

      {showCustomLineButton && (
        <a
          href={lineDeepLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat us on LINE"
          aria-label="Chat us on LINE"
          style={{
            position: 'fixed',
            right: 22,
            bottom: 22,
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#06c755', // LINE brand green
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35), 0 0 0 4px rgba(6,199,85,0.18)',
            zIndex: 99998,
            textDecoration: 'none',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {/* Minimal LINE chat glyph (white speech bubble + "LINE") */}
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
            <path
              fill="#fff"
              d="M16 4C8.82 4 3 8.59 3 14.24c0 5.06 4.61 9.31 10.84 10.11.42.09.99.27 1.13.62.13.32.08.81.04 1.13l-.18 1.1c-.06.32-.26 1.27 1.11.69 1.37-.58 7.38-4.34 10.07-7.43h-.01C27.83 18.43 29 16.46 29 14.24 29 8.59 23.18 4 16 4zM10.92 17.43H8.7c-.32 0-.58-.26-.58-.58V12.4c0-.32.26-.58.58-.58.32 0 .58.26.58.58v3.87h1.64c.32 0 .58.26.58.58s-.26.58-.58.58zm2.04-.58c0 .32-.26.58-.58.58s-.58-.26-.58-.58V12.4c0-.32.26-.58.58-.58s.58.26.58.58v4.45zm5.5 0c0 .25-.16.47-.39.55-.06.02-.13.03-.19.03-.18 0-.35-.09-.46-.23l-2.27-3.09v2.74c0 .32-.26.58-.58.58s-.58-.26-.58-.58V12.4c0-.25.16-.47.4-.55.06-.02.12-.03.18-.03.18 0 .35.09.46.23l2.27 3.09V12.4c0-.32.26-.58.58-.58s.58.26.58.58v4.45zm3.7-2.78c.32 0 .58.26.58.58s-.26.58-.58.58h-1.65v1.05h1.65c.32 0 .58.26.58.58s-.26.58-.58.58h-2.22c-.32 0-.58-.26-.58-.58V12.4c0-.32.26-.58.58-.58h2.22c.32 0 .58.26.58.58s-.26.58-.58.58h-1.65v1.09h1.65z"
            />
          </svg>
        </a>
      )}

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <div className="footer-grid">
        <div>
          <div className="brand">RETROCONSOLE 1981</div>
          <div className="brand-sub">Retro Game Emporium — restoring carts, consoles and CRT memories since 1981. Handled with care by humans, not algorithms.</div>
          <div className="pay">
            <span className="p">VISA</span><span className="p">MC</span><span className="p">AMEX</span><span className="p">APPLE</span><span className="p">PIXEL$</span>
          </div>
        </div>
        <div>
          <h5>SHOP</h5>
          <ul>
            <li><Link to="/shop?category=consoles">Consoles</Link></li>
            <li><Link to="/shop?category=games">Cartridges</Link></li>
            <li><Link to="/shop?category=controllers">Controllers</Link></li>
            <li><Link to="/shop?category=accessories">Accessories</Link></li>
            <li><Link to="/shop?category=apparel">Apparel</Link></li>
          </ul>
        </div>
        <div>
          <h5>SUPPORT</h5>
          <ul>
            <li><a href="#">Help / FAQ</a></li>
            <li><a href="#">Shipping</a></li>
            <li><a href="#">Returns</a></li>
            <li><Link to="/orders">Track Order</Link></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
        <div>
          <h5>GUILD</h5>
          <ul>
            <li><Link to="/register">Join the Guild</Link></li>
            <li><a href="#">Members Vault</a></li>
            <li><a href="#">Pixel Coins</a></li>
            <li><a href="#">Mystery Cart</a></li>
            <li><a href="#">Refer a Friend</a></li>
          </ul>
        </div>
        <div>
          <h5>WORLD</h5>
          <ul>
            <li><a href="#">Our Workshop</a></li>
            <li><a href="#">Pixel Zine</a></li>
            <li><a href="#">Trade-In</a></li>
            <li><a href="#">Wholesale</a></li>
            <li><a href="#">Press Kit</a></li>
          </ul>
        </div>
      </div>
      <div className="bottom">
        <div>© 1981–2026 RETROCONSOLE 1981 LLC · ALL RIGHTS RESERVED</div>
        <div className="right">
          <a href="#">PRIVACY</a><a href="#">TERMS</a><a href="#">COOKIES</a><a href="#">DO NOT SELL</a>
        </div>
      </div>
      <div className="credits">▲▲▼▼◀▶◀▶ B A START — THANKS FOR PLAYING ▲▲▼▼◀▶◀▶ B A START</div>
    </div>
  );
}
