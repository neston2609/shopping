import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { cart, updateItem, removeItem } = useCart();

  if (!cart.items.length) {
    return (
      <div className="container">
        <h1 className="page-title">▶ YOUR BAG</h1>
        <div className="empty-state">
          <div style={{ fontFamily: 'Press Start 2P', fontSize: 14, color: 'var(--magenta)' }}>BAG EMPTY</div>
          <p style={{ marginTop: 16 }}>No loot collected yet, hero.</p>
          <Link className="btn btn--lime" to="/shop" style={{ marginTop: 20 }}>▶ ENTER SHOP</Link>
        </div>
      </div>
    );
  }

  const shipping = cart.subtotal >= 50 ? 0 : 6.99;

  return (
    <div className="container">
      <h1 className="page-title">▶ YOUR BAG <span className="muted">// {cart.count} items</span></h1>

      <div className="checkout-grid">
        <div className="panel-box">
          {cart.items.map((it) => (
            <div className="cart-row" key={it.id}>
              <div className={`cart-thumb art ${it.artVariant && it.artVariant.startsWith('cart-') ? it.artVariant : 'cart-mag'}`} />
              <div>
                <Link to={`/product/${it.slug}`} style={{ fontFamily: 'Press Start 2P', fontSize: 10, color: '#fff' }}>{it.name}</Link>
                <div className="muted" style={{ marginTop: 6 }}>{it.rarity.toUpperCase()} · SKU {it.sku}</div>
              </div>
              <div className="qty">
                <button onClick={() => updateItem(it.id, Math.max(1, it.quantity - 1))}>-</button>
                <span style={{ fontFamily: 'Press Start 2P', fontSize: 11, minWidth: 22, textAlign: 'center' }}>{it.quantity}</span>
                <button onClick={() => updateItem(it.id, it.quantity + 1)}>+</button>
              </div>
              <div style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--gold)' }}>฿{it.lineTotal.toFixed(2)}</div>
              <button className="chip" onClick={() => removeItem(it.id)}>✕</button>
            </div>
          ))}
        </div>

        <div className="summary">
          <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// ORDER SUMMARY</h3>
          <div className="line"><span>Subtotal</span><span>฿{cart.subtotal.toFixed(2)}</span></div>
          <div className="line"><span>Shipping (est.)</span><span>{shipping === 0 ? 'FREE' : `฿${shipping.toFixed(2)}`}</span></div>
          <div className="line total"><span>TOTAL</span><span>฿{(cart.subtotal + shipping).toFixed(2)}</span></div>
          {cart.subtotal < 50 && <div className="muted" style={{ marginTop: 8 }}>Add ฿{(50 - cart.subtotal).toFixed(2)} for FREE shipping!</div>}
          <Link className="btn btn--lime" to="/checkout" style={{ width: '100%', marginTop: 16 }}>▶ CHECKOUT</Link>
          <Link className="btn btn--ghost" to="/shop" style={{ width: '100%', marginTop: 10 }}>CONTINUE SHOPPING</Link>
        </div>
      </div>
    </div>
  );
}
