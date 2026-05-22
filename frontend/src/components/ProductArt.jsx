// Renders the retro cartridge / consolette artwork for a product, derived from
// its artVariant. Mirrors the pixel art in the original design prototype.

const CART_COLORS = {
  'cart-mag': 'mag',
  'cart-cyn': 'cyn',
  'cart-lim': 'lim',
  'cart-gld': 'gld',
  'cart-pur': 'pur',
  'cart-org': 'org',
};

function shortLabel(name) {
  return name.replace(/[:].*$/, '').split(' ').slice(0, 2).join(' ').toUpperCase();
}

export default function ProductArt({ product }) {
  const variant = product.artVariant || 'cart-mag';

  // Console-style products render as a "consolette" pictogram.
  const isConsole = product.category?.name === 'Consoles' || /console|handheld|drive/i.test(product.name);

  if (isConsole) {
    const tone = variant === 'cart-lim' ? 'gb' : 'cd';
    return (
      <div className={`consolette ${tone}`}>
        <div className="scr" />
        <div className="pad" />
      </div>
    );
  }

  const color = CART_COLORS[variant] || 'mag';
  const [a, b] = shortLabel(product.name).split(' ');
  return (
    <div className={`cartridge ${color}`}>
      <div className="top" />
      <div className="lbl">
        {a}
        {b ? <br /> : null}
        {b}
      </div>
      <div className="pins" />
    </div>
  );
}

export { CART_COLORS };
