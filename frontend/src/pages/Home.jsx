import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';

const CHIPS = ['ALL', 'CONSOLES', 'CARTRIDGES', 'CONTROLLERS', 'ACCESSORIES', 'UNDER ฿50', 'RARE+'];

function Hero({ heroHeading, heroSubheading, freeShipping }) {
  const showFreeShip = freeShipping?.enabled && freeShipping.threshold > 0;
  return (
    <div className="hero">
      <div className="hero-grid">
        <div>
          <span className="tag" style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>⌂ PRESS START</span>
          {heroHeading ? (
            <h1 dangerouslySetInnerHTML={{ __html: heroHeading }} />
          ) : (
            <h1>
              COLLECT THE<br />
              <span className="cyan">CONSOLES</span> THAT<br />
              BUILT YOUR<br />
              <span className="gold">CHILDHOOD</span>.
            </h1>
          )}
          {heroSubheading ? (
            <p dangerouslySetInnerHTML={{ __html: heroSubheading }} />
          ) : (
            <p>Hand-restored handhelds. Sealed cartridges. CRT-ready cables. Every drop comes with a 30-day reset button{showFreeShip ? ` and free shipping over ฿${Number(freeShipping.threshold).toLocaleString()}` : ''}.</p>
          )}
          <div className="cta-row">
            <Link className="btn btn--lime" to="/shop">▶ ENTER SHOP</Link>
            <Link className="btn btn--ghost" to="/shop?sort=newest">VIEW NEW DROPS</Link>
            <span className="hint">PRESS <span className="kbd">A</span> TO BUY · <span className="kbd">B</span> TO BROWSE</span>
          </div>
          <div className="badges">
            {showFreeShip && <span className="b bm">FREE SHIP ฿{Number(freeShipping.threshold).toLocaleString()}+</span>}
            <span className="b bc">30-DAY RESET</span>
            <span className="b bl">TESTED + WORKING</span>
            <span className="b bg">EARN COINS</span>
          </div>
        </div>

        <div className="console-display">
          <div className="screen">
            <div className="marquee">★ FEATURED BOSS DROP ★ LIMITED 250 UNITS</div>
            <div className="lifebar"><div className="heart" /><div className="bar"><i /></div></div>
            <div className="stage">
              <div className="console">
                <div className="strip" />
                <div className="screenlbl">HP·MP·EXP</div>
                <div className="dpad" />
                <div className="btns"><i /><i /><i /><i /></div>
              </div>
            </div>
            <div className="price">
              <div><div className="label">PRICE</div><div><span className="strike">฿229</span><span className="value">฿179</span></div></div>
              <div style={{ textAlign: 'right' }}><div className="label">STOCK</div><div className="value" style={{ color: 'var(--magenta)' }}>12/250</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UspStrip() {
  const items = [
    { ic: '✈', t: 'FREE SHIPPING', s: 'on orders over ฿50' },
    { ic: '↺', t: '30-DAY RESET', s: 'return any quest' },
    { ic: '✓', t: 'TESTED & WORKING', s: 'graded by humans' },
    { ic: '$', t: 'EARN PIXEL COINS', s: '฿1 spent = 1 coin' },
  ];
  return (
    <div className="usp">
      {items.map((u) => (
        <div className="u" key={u.t}>
          <div className="ic">{u.ic}</div>
          <div className="t">{u.t}<small>{u.s}</small></div>
        </div>
      ))}
    </div>
  );
}

function Categories({ categories }) {
  return (
    <div className="section">
      <h2><span className="arrow">▶</span> SELECT YOUR CATEGORY <span className="sub">// {categories.length} worlds available</span></h2>
      <div className="cats">
        {categories.map((c) => (
          <Link className="cat" key={c.id} to={`/shop?category=${c.slug}`}>
            <div className="top" style={{ background: c.imageColor || 'var(--magenta)' }}>
              <div className="glyph"><div className="glyphlbl">{c.glyph || c.name.slice(0, 4).toUpperCase()}</div></div>
              <div className="lbl">{(c.glyph || c.name).toUpperCase()}</div>
            </div>
            <div className="body">
              <div className="name">{c.name.toUpperCase()}</div>
              <div className="meta">
                <span>{c.description || 'retro gear'}</span>
                <span className="lvl">{c.productCount ?? 0} ITEMS</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BossDrop({ product }) {
  const { addItem } = useCart();
  if (!product) return null;
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;
  return (
    <div className="boss">
      <div className="display">
        <div className="frame">
          <div className="hero-console">
            <div className="scr"><span>● {product.name.split(' ')[0].toUpperCase()}.V2 ●</span></div>
            <div className="row">
              <div className="dpad" />
              <div className="pads"><i /><i /><i /><i /></div>
            </div>
          </div>
          <div className="corners"><i /><i /><i /><i /></div>
        </div>
        <div className="thumbs">
          <div className="thumb on">FRONT</div><div className="thumb">BACK</div><div className="thumb">BOX</div><div className="thumb">PADS</div>
        </div>
      </div>
      <div className="info">
        <div className="tag-row">
          <span className="tag" style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>★ BOSS DROP</span>
          <span className="tag" style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>LIMITED 250</span>
          <span className="tag">FREE SHIP</span>
        </div>
        <h2>{product.name.toUpperCase()}</h2>
        <div className="sub">// {product.platform || '4-PLAYER · CRT + HDMI OUT'}</div>
        <p className="desc">{product.description}</p>
        <div className="stats">
          <h4>// ITEM STATS</h4>
          <div className="row"><span className="k">ATK</span><div className="bar"><i className="atk" style={{ width: '84%' }} /></div><span className="v">84</span></div>
          <div className="row"><span className="k">DEF</span><div className="bar"><i className="def" style={{ width: '72%' }} /></div><span className="v">72</span></div>
          <div className="row"><span className="k">SPD</span><div className="bar"><i className="spd" style={{ width: '91%' }} /></div><span className="v">91</span></div>
          <div className="row"><span className="k">LCK</span><div className="bar"><i className="lck" style={{ width: '66%' }} /></div><span className="v">66</span></div>
        </div>
        <div className="price-row">
          <div className="price">
            {hasDiscount ? <span className="s">฿{product.price}</span> : null}
            <span className="v">฿{hasDiscount ? product.discountPrice : product.price}</span>
          </div>
          <div className="stock">⬤ {product.stock} LEFT</div>
        </div>
        <div className="cta-row">
          <button className="btn" style={{ background: 'var(--magenta)' }} onClick={() => addItem(product.id, 1)}>⊕ ADD TO BAG</button>
          <Link className="btn btn--cyan" to={`/product/${product.slug}`}>⚑ VIEW SPECS</Link>
        </div>
        <div className="extras">
          <div className="x"><b>SHIPS</b>in 1–2 days, worldwide</div>
          <div className="x"><b>WARRANTY</b>90-day reset, parts + labor</div>
          <div className="x"><b>EARN</b>+{Math.floor(hasDiscount ? product.discountPrice : product.price)} coins on purchase</div>
        </div>
      </div>
    </div>
  );
}

function DailyDeal({ deals }) {
  const [secs, setSecs] = useState(9);
  const [mins, setMins] = useState(37);
  useEffect(() => {
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 0) {
          setMins((m) => (m <= 0 ? 59 : m - 1));
          return 59;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="deal">
      <div className="panel">
        <span className="tag">⏱ DAILY QUEST · 24H ONLY</span>
        <h2>BONUS STAGE:<br />SPEND ฿100, UNLOCK<br />A MYSTERY CARTRIDGE</h2>
        <div className="timer">
          <div className="t"><div className="n">02</div><div className="l">DAYS</div></div>
          <div className="t"><div className="n">14</div><div className="l">HRS</div></div>
          <div className="t"><div className="n">{pad(mins)}</div><div className="l">MIN</div></div>
          <div className="t"><div className="n">{pad(secs)}</div><div className="l">SEC</div></div>
        </div>
        <div className="perks">
          <div className="p"><i>✓</i> Free worldwide shipping</div>
          <div className="p"><i>✓</i> Random rare-tier reward</div>
          <div className="p"><i>✓</i> Sealed and authenticated</div>
          <div className="p"><i>✓</i> No code needed at checkout</div>
        </div>
        <div className="ctas">
          <Link className="btn btn--gold" to="/shop">▶ ACCEPT QUEST</Link>
          <a className="btn btn--ghost" href="#">RULES</a>
        </div>
      </div>
      <div className="right">
        {deals.map((d, i) => {
          const lvls = ['04', '07', '12', '18'];
          const disc = d.discountPrice && d.price ? Math.round((1 - d.discountPrice / d.price) * 100) : 25;
          return (
            <Link className="mini" key={d.id} to={`/product/${d.slug}`}>
              <div className="top"><span className="lvl">LVL {lvls[i] || '05'} · DEAL</span><span className="drop">-{disc}%</span></div>
              <div className="art"><span>★ {(d.platform || d.name).split(' ')[0].toUpperCase()}</span></div>
              <div className="name">{d.name}</div>
              <div className="price">
                {d.discountPrice ? <span className="s">฿{d.price}</span> : null}
                <span className="v">฿{d.discountPrice || d.price}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="how">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, color: '#fff', textShadow: '3px 3px 0 var(--magenta)' }}>
        <span style={{ color: 'var(--lime)' }}>▶</span> HOW THE QUEST WORKS <span className="sub" style={{ marginLeft: 'auto', fontFamily: 'VT323', color: 'var(--ink-dim)' }}>// 3 stages to checkout</span>
      </h2>
      <div className="how-grid">
        <div className="step"><div className="n">1</div><h3>PICK YOUR LOOT</h3><p>Filter by platform, era or rarity. Every item is graded by our crew on a 1–10 scale and photographed front + back.</p><div className="icon">[ INVENTORY SCREEN ]</div></div>
        <div className="step"><div className="n">2</div><h3>EARN PIXEL COINS</h3><p>Spend ฿1 = 1 coin. Coins stack across orders and unlock secret tier discounts at LVL 10, 25 and 50.</p><div className="icon">[ COIN WALLET ]</div></div>
        <div className="step"><div className="n">3</div><h3>SHIP + PLAY</h3><p>Foam-lined boxes, tracked shipping, 30-day reset button. Hit any issue and we'll respawn your order, no questions.</p><div className="icon">[ DELIVERY DRONE ]</div></div>
      </div>
    </div>
  );
}

function Guild() {
  return (
    <div className="guild">
      <div>
        <span className="tag" style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>⌂ NEW SAVE FILE</span>
        <h2>JOIN THE RC81 GUILD<br />UNLOCK -15% ON YOUR<br />FIRST QUEST</h2>
        <p>Drop your email and we'll add you to the guild roster. Members get drop notifications 24 hours early, monthly mystery cartridges, and access to the Members-Only Vault.</p>
        <div className="perks">
          <div className="p">EARLY DROPS</div><div className="p">2X COINS</div><div className="p">MEMBERS VAULT</div><div className="p">FREE MYSTERY ZINE</div>
        </div>
      </div>
      <div className="form">
        <div className="head"><h3>NEW PLAYER · ENTER NAME</h3><span className="lvl">LVL 01</span></div>
        <div className="field"><label>PLAYER NAME</label><div className="input"><input defaultValue="Player_1" /><div className="caret" /></div></div>
        <div className="field"><label>EMAIL ADDRESS</label><div className="input"><input defaultValue="hero@retroconsole1981.gg" /><div className="caret" /></div></div>
        <div className="opts">
          <label className="on"><span className="box" /> NEW DROPS</label>
          <label className="on"><span className="box" /> WEEKLY ZINE</label>
          <label><span className="box" /> EVENT INVITES</label>
        </div>
        <Link className="btn btn--lime submit" to="/register">▶ START NEW GAME</Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [chip, setChip] = useState('ALL');
  const [freeShipping, setFreeShipping] = useState({ enabled: false, threshold: 0 });
  const [storeSettings, setStoreSettings] = useState({ heroHeading: '', heroSubheading: '' });

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
    api.get('/products/featured').then((d) => setFeatured(d.items || [])).catch(() => {});
    api.get('/shipping-methods').then((d) => setFreeShipping(d.freeShipping || { enabled: false, threshold: 0 })).catch(() => {});
    api.get('/store-settings').then(setStoreSettings).catch(() => {});
  }, []);

  const boss = featured.find((p) => p.rarity === 'legendary') || featured[0];
  const deals = featured.filter((p) => p.discountPrice).slice(0, 4);

  return (
    <>
      <Hero heroHeading={storeSettings.heroHeading} heroSubheading={storeSettings.heroSubheading} freeShipping={freeShipping} />
      <UspStrip />
      {categories.length > 0 && <Categories categories={categories} />}

      <div className="section" id="shop">
        <h2><span className="arrow">▶</span> FEATURED LOOT <span className="sub">// fresh drops · sort by rarity</span></h2>
        <div className="toolbar">
          {CHIPS.map((c) => (
            <button key={c} className={`chip ${chip === c ? 'on' : ''}`} onClick={() => setChip(c)}>{c}</button>
          ))}
          <div className="sep" />
          <div className="sort">SORT BY <span className="sel">RARITY ▼</span></div>
        </div>
        <div className="grid">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Link className="btn btn--cyan" to="/shop">▶ LOAD MORE LOOT</Link>
        </div>
      </div>

      <BossDrop product={boss} />
      {deals.length > 0 && <DailyDeal deals={deals} />}
      <HowItWorks />
      <Guild />
    </>
  );
}
