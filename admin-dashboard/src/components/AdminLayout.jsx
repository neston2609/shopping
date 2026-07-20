import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

const LINKS = [
  ['/', 'DASHBOARD'],
  ['/storefront', 'STOREFRONT'],
  ['/products', 'PRODUCTS'],
  ['/categories', 'CATEGORIES'],
  ['/orders', 'ORDERS'],
  ['/customers', 'CUSTOMERS'],
  ['/discounts', 'DISCOUNTS'],
  ['/shipping', 'SHIPPING'],
  ['/payments', 'PAYMENTS'],
  ['/smtp', 'SMTP / EMAIL'],
  ['/ai', 'AI CONFIG'],
  ['/templates', 'TEMPLATES'],
  ['/email-logs', 'EMAIL LOGS'],
  ['/downloads', 'DOWNLOADS'],
  ['/sources', 'DL SOURCES'],
  ['/account', 'MY ACCOUNT'],
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="px">LOADING…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">RC81 ADMIN<small>// CONTROL PANEL</small></div>
        <nav>
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn--ghost btn--sm signout" onClick={logout}>SIGN OUT</button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
