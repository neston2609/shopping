import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductArt from '../components/ProductArt';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setProduct(null);
    api.get(`/products/${slug}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <div className="container"><div className="error-msg">{error}</div></div>;
  if (!product) return <div className="loading">LOADING ITEM…</div>;

  const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;
  const artClass = product.artVariant && product.artVariant.startsWith('cart-') ? product.artVariant : 'cart-mag';

  const onAdd = async () => {
    await addItem(product.id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="boss" style={{ borderTop: 'none' }}>
      <div className="display">
        <div className={`frame ${artClass}`} style={{ display: 'grid', placeItems: 'center' }}>
          <ProductArt product={product} />
          <div className="corners"><i /><i /><i /><i /></div>
        </div>
        <div className="thumbs">
          {(product.images.length ? product.images : [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]).slice(0, 4).map((img, i) => (
            <div key={i} className={`thumb ${i === 0 ? 'on' : ''}`}>{['FRONT', 'BACK', 'BOX', 'PADS'][i]}</div>
          ))}
        </div>
      </div>

      <div className="info">
        <div className="tag-row">
          <span className="tag" style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>{product.rarity.toUpperCase()}</span>
          {product.category ? <span className="tag" style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>{product.category.name.toUpperCase()}</span> : null}
          <span className="tag">SKU {product.sku}</span>
        </div>
        <h2>{product.name.toUpperCase()}</h2>
        <div className="sub">// {product.platform || 'RETRO COLLECTIBLE'}</div>
        <p className="desc">{product.description}</p>

        {product.attributes.length > 0 && (
          <div className="extras" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            {product.attributes.map((a) => (
              <div className="x" key={a.id}><b>{a.name.toUpperCase()}</b>{a.value}</div>
            ))}
          </div>
        )}

        <div className="price-row">
          <div className="price">
            {hasDiscount ? <span className="s">${product.price}</span> : null}
            <span className="v">${hasDiscount ? product.discountPrice : product.price}</span>
          </div>
          <div className="stock">{product.stock > 0 ? `⬤ ${product.stock} IN STOCK` : '✕ SOLD OUT'}</div>
        </div>

        <div className="cta-row" style={{ alignItems: 'center' }}>
          <div className="qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
            <span style={{ fontFamily: 'Press Start 2P', fontSize: 12, minWidth: 24, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
          </div>
          <button className="btn" style={{ background: 'var(--magenta)' }} onClick={onAdd} disabled={product.stock <= 0}>
            ⊕ ADD TO BAG
          </button>
          <Link className="btn btn--cyan" to="/cart">VIEW BAG</Link>
        </div>
        {added && <div className="success-msg">Added to bag! +{Math.floor((hasDiscount ? product.discountPrice : product.price) * qty)} coins on purchase.</div>}
      </div>
    </div>
  );
}
