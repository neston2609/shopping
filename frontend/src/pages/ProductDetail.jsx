import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductArt from '../components/ProductArt';
import { useCart } from '../context/CartContext';

// Extract a YouTube video id from a watch / short / embed URL.
function youtubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(embed|shorts)\/([^/?#]+)/);
    if (m) return m[2];
  } catch (e) { /* */ }
  return null;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
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

  const ytId = youtubeId(product.youtubeUrl);
  const images = product.images || [];

  return (
    <div className="boss" style={{ borderTop: 'none' }}>
      <div className="display">
        <div className={`frame ${artClass}`} style={{ display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {showVideo && ytId ? (
            <iframe
              title="Product video"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              style={{ width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : images.length > 0 ? (
            <img src={images[activeImage]?.url} alt={images[activeImage]?.alt || product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <>
              <ProductArt product={product} />
              <div className="corners"><i /><i /><i /><i /></div>
            </>
          )}
        </div>
        <div className="thumbs">
          {(images.length ? images : [null, null, null, null]).slice(0, 4).map((img, i) => (
            <div
              key={img?.id ?? i}
              className={`thumb ${!showVideo && activeImage === i ? 'on' : ''}`}
              onClick={() => { setActiveImage(i); setShowVideo(false); }}
              style={img ? { backgroundImage: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' } : { cursor: img ? 'pointer' : 'default' }}
            >
              {!img && ['FRONT', 'BACK', 'BOX', 'PADS'][i]}
            </div>
          ))}
        </div>
        {ytId && (
          <button
            className="btn btn--magenta"
            style={{ background: 'var(--magenta)', color: '#fff', width: '100%', marginTop: 10 }}
            onClick={() => setShowVideo((v) => !v)}
          >
            {showVideo ? '◀ BACK TO IMAGES' : '▶ WATCH VIDEO'}
          </button>
        )}
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
            {hasDiscount ? <span className="s">฿{product.price}</span> : null}
            <span className="v">฿{hasDiscount ? product.discountPrice : product.price}</span>
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
