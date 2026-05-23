import { Link } from 'react-router-dom';
import ProductArt, { CART_COLORS } from './ProductArt';
import { useCart } from '../context/CartContext';

const RARITY_LABEL = {
  common: '● COMMON',
  rare: '▲ RARE',
  epic: '◆ EPIC',
  legendary: '★ LEGENDARY',
};

// Deterministic-ish stat bars derived from product id so cards look "RPG-like".
function stat(seed, base) {
  return 30 + ((seed * base) % 70);
}

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const artClass = product.artVariant && product.artVariant.startsWith('cart-') ? product.artVariant : 'cart-mag';
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;
  const save = hasDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : null;

  const onAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addItem(product.id, 1);
  };

  return (
    <Link className="card" to={`/product/${product.slug}`}>
      <div className={`art ${artClass}`}>
        <span className={`rarity ${product.rarity}`}>{RARITY_LABEL[product.rarity] || product.rarity}</span>
        <span className="heart">♥</span>
        <ProductArt product={product} />
        {save ? <span className="save">-{save}%</span> : null}
      </div>
      <div className="body">
        <div className="platform">{product.platform || product.category?.name || 'RETRO'}</div>
        <div className="name">{product.name}</div>
        <div className="stats">
          <div className="stat"><div className="k">RAR</div><div className="bar"><i style={{ width: `${stat(product.id, 17)}%`, background: 'var(--gold)' }} /></div></div>
          <div className="stat"><div className="k">FUN</div><div className="bar"><i style={{ width: `${stat(product.id, 23)}%` }} /></div></div>
          <div className="stat"><div className="k">LORE</div><div className="bar"><i style={{ width: `${stat(product.id, 29)}%`, background: 'var(--epic)' }} /></div></div>
          <div className="stat"><div className="k">DIFF</div><div className="bar"><i style={{ width: `${stat(product.id, 31)}%`, background: 'var(--magenta)' }} /></div></div>
        </div>
      </div>
      <div className="footer">
        <div className="price">
          {hasDiscount ? <span className="s">฿{product.price}</span> : null}
          <span className="v">฿{hasDiscount ? product.discountPrice : product.price}</span>
        </div>
        <button className="add" onClick={onAdd} disabled={product.stock <= 0}>
          {product.stock <= 0 ? 'SOLD' : '+ ADD'}
        </button>
      </div>
    </Link>
  );
}
