import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { DESIGN, ITEM, ITEMS, RARITY_ORDER, bagPrice, catalog, normaliseId, priceLabel, rarityInfo, shows3d } from '../../shared/marbles';
import { GLOSS } from '../../shared/marbles/badge';
import economy from '../../shared/economy.json';
import { COIN_PACKS } from '../../shared/payments/packs';
import { importOrReload } from '../../utils/staleCode';
import MarbleBadge from '../marbles/MarbleBadge';
import { editionLine, useCollection } from '../marbles/useCollection';
import { TEASERS } from '../shop/comingSoon';
import { track } from '../consent/tracking';

const Turntable = lazy(() => importOrReload(() => import('../marbles/Turntable')));

const COLLECTION = catalog.collection;
const SC_DESIGNS = catalog.designs.filter((d) => !d.limited);
const SC_ITEMS = ITEMS.filter((i) => !i.design.limited);
const SHADES = SC_DESIGNS[0].shades.map((s) => ({ key: s.key, name: s.name }));
const RARITIES = RARITY_ORDER.filter((r) => r !== 'limited' && SC_DESIGNS.some((d) => d.rarity === r));
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * The shop: the live collection (Schoolyard Classics) with its two bags, every
 * marble in every shade with rarity and shade filters and Find by ID, a big
 * view with the 3D marble and a shade switcher, the next collections, and
 * coin packs. /collection and /collection/:design?shade= open it
 * too (the second with that marble's big view open), and so does ?id=SC105.
 */
export default function ShopPage() {
  const { design: designParam } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { live, owned, buy, reload } = useCollection();
  const [rarity, setRarity] = useState('all');
  const [shade, setShade] = useState('all');
  const [find, setFind] = useState(search.get('id') ?? '');

  // The marble in the big view: from /collection/:design?shade=, or ?id=SC105.
  const fromUrl = useMemo(() => {
    if (designParam && DESIGN[designParam]) {
      const d = DESIGN[designParam];
      const s = d.shades.find((x) => x.key === search.get('shade')) ?? d.shades[0];
      return `${d.key}-${s.key}`;
    }
    const byId = normaliseId(search.get('id'));
    return ITEMS.find((i) => i.id === byId)?.slug ?? null;
  }, [designParam, search]);
  const [open, setOpen] = useState(fromUrl);
  useEffect(() => setOpen(fromUrl), [fromUrl]);
  useEffect(() => { track('shop_view'); }, []);
  const close = () => {
    setOpen(null);
    if (designParam || search.get('id')) navigate('/shop', { replace: true });
  };

  const query = find.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const shown = SC_ITEMS.filter((i) => (rarity === 'all' || i.rarity === rarity) && (shade === 'all' || i.shade.key === shade) && (!query || i.id.includes(query)));
  const limited = catalog.designs.find((d) => d.limited);
  const ltdSlug = limited && `${limited.key}-${limited.shades[0].key}`;
  const ltdOnSale = limited && live[ltdSlug]?.onSale !== false && new Date(limited.limited.saleEndsAt) > new Date();

  return (
    <div className="ms-page">
      <Hero owned={owned} onBought={reload} />

      <section aria-labelledby="all-h" style={{ display: 'grid', gap: 14 }}>
        <div className="ms-section-head" style={{ justifyContent: 'space-between' }}>
          <h2 id="all-h">All marbles</h2>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{shown.length} of {SC_ITEMS.length} shown</span>
        </div>
        <div className="ms-chips" role="group" aria-label="Filter by rarity">
          <span className="ms-chips__label">Rarity</span>
          {['all', ...RARITIES].map((r) => (
            <button key={r} type="button" aria-pressed={rarity === r} onClick={() => setRarity(r)}>{r === 'all' ? 'All' : rarityInfo(r).label}</button>
          ))}
        </div>
        <div className="ms-chips" role="group" aria-label="Filter by shade">
          <span className="ms-chips__label">Shade</span>
          {[{ key: 'all', name: 'All' }, ...SHADES].map((s) => (
            <button key={s.key} type="button" aria-pressed={shade === s.key} onClick={() => setShade(s.key)}>{s.name}</button>
          ))}
        </div>
        <div className="ms-chips">
          <label className="ms-chips__label" htmlFor="find-id">Find by ID</label>
          <input id="find-id" className="ms-find" type="text" value={find} onChange={(e) => setFind(e.target.value)} placeholder="e.g. SC105" autoComplete="off" spellCheck={false} />
          {query && shown.length === 1 && <button type="button" className="ms-btn ms-btn--sm ms-btn--primary" onClick={() => setOpen(shown[0].slug)}>Open #{shown[0].id}</button>}
        </div>
        {shown.length ? (
          <div className="ms-grid50">
            {shown.map((i) => <MarbleCard key={i.slug} item={i} owned={owned.has(i.slug)} onOpen={() => setOpen(i.slug)} />)}
          </div>
        ) : (
          <p className="ms-note">No marble has an ID like “{find}”. Marble IDs are two letters and three digits, e.g. SC105.</p>
        )}
      </section>

      {ltdOnSale && (
        <section aria-labelledby="ltd-h" className="ms-hero" style={{ borderColor: 'var(--r-limited)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', flex: '0 1 160px' }}><MarbleBadge slug={ltdSlug} size={130} label={limited.name} /></div>
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="ms-mcard__rarity" style={{ color: 'var(--r-limited)', margin: 0 }}>Limited edition · #{ITEM[ltdSlug].id}</span>
            <h2 id="ltd-h" className="ms-h2" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{limited.name}</h2>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>{limited.story}</p>
            <button type="button" className="ms-btn ms-btn--primary" style={{ justifySelf: 'start' }} onClick={() => setOpen(ltdSlug)}>See it</button>
          </div>
        </section>
      )}

      <ComingSoon />

      <CoinPacks />

      <p className="ms-note">Looks only, never speed: every marble races exactly the same. The first {catalog.editionSize} of every marble are a numbered First Edition.</p>

      {open && ITEM[open] && <MarbleSheet slug={open} onSlug={setOpen} owned={owned} live={live} buy={buy} onClose={close} />}
    </div>
  );
}

/** One marble in the grid: its picture, rarity, name, shade, collection, Marble ID and price. */
function MarbleCard({ item, owned, onOpen }) {
  const info = rarityInfo(item.rarity);
  return (
    <button type="button" className={`ms-mcard ms-mcard--grid${item.rarity === 'legendary' ? ' ms-mcard--legend' : ''}`} onClick={onOpen}
      aria-label={`${item.design.name}, ${item.shade.name}, #${item.id}, ${info.label}, ${owned ? 'owned' : priceLabel(item.price)}`}>
      <MarbleBadge slug={item.slug} size={84} />
      <span className="ms-mcard__rarity" style={{ color: info.colour }}>{info.label}</span>
      <span className="ms-mcard__name" style={{ fontSize: '1rem' }}>{item.design.name}</span>
      <span className="ms-mcard__shade">{item.shade.name}</span>
      <span className="ms-id">#{item.id}</span>
      <span className="ms-mcard__col">{item.collection}</span>
      <span className="ms-mcard__price" style={owned ? { color: 'var(--ms-green)' } : undefined}>{owned ? 'Owned' : priceLabel(item.price)}</span>
    </button>
  );
}

/** The live collection's hero: its name and story, three of its marbles, and the two bags with a shade to pick. */
function Hero({ owned, onBought }) {
  const { isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [shade, setShade] = useState('classic');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const offers = useAsync(() => api.bags(shade).catch(() => null), [shade, isAuthenticated, owned.size]);
  const offer = (key) => offers.data?.bags?.find((b) => b.bag === key);
  const shadeName = SHADES.find((s) => s.key === shade)?.name;
  const heroBalls = ['steelie-classic', 'champion-classic', 'flame-swirl-sunset'].filter((s) => ITEM[s]);

  const buyBag = async (key) => {
    if (!isAuthenticated) { navigate('/signup?next=/shop'); return; }
    if (confirm !== key) { setConfirm(key); setMsg(null); return; }
    setBusy(true);
    try {
      const r = await api.buyBag(key, shade);
      setMsg({ ok: true, text: `${economy.bags[key].label} (${shadeName}): ${r.copies.length} marble${r.copies.length === 1 ? '' : 's'} added to your Marble Bag.` });
      await Promise.all([onBought(), refreshUser(), offers.reload()]);
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const bagButton = (key, main) => {
    const bag = economy.bags[key];
    const o = offer(key);
    const count = o?.items.length ?? SC_DESIGNS.filter((d) => bag.rarities.includes(d.rarity)).length;
    const full = o ? o.missing === o.items.length : true;
    const worth = SC_ITEMS.filter((i) => bag.rarities.includes(i.rarity) && i.shade.key === shade).reduce((n, i) => n + (i.price.coins ?? 0), 0);
    const price = priceLabel({ coins: o ? o.price : bagPrice(key, worth) });
    const done = o && !o.missing;
    return (
      <button type="button" className={`ms-bag${main ? ' ms-bag--main' : ''}`} onClick={() => buyBag(key)} disabled={busy || done}>
        <b>{confirm === key ? `CONFIRM: ${price.replace(/^[●◆] /, '')}` : bag.label.toUpperCase()}</b>
        <small>
          {done ? `You own all ${count} in ${shadeName}` : `${key === 'full' ? `All ${count} marbles` : `The ${count} Commons`} in ${shadeName} · ${price}`}
          {!done && full && <> <s>{worth.toLocaleString('en-US')}</s> · {Math.round(bag.discount * 100)}% off</>}
          {!done && !full && ` (for the ${o.missing} you don't have)`}
        </small>
      </button>
    );
  };

  return (
    <section className="ms-hero ms-hero--shop" aria-labelledby="col-h">
      <div style={{ display: 'grid', gap: 12 }}>
        <span className="ms-badge-label">COLLECTION {COLLECTION.number} · LIVE NOW</span>
        <h1 id="col-h" className="ms-h1 ms-shop-title">{COLLECTION.name}</h1>
        <p className="ms-lede" style={{ margin: 0 }}>{COLLECTION.tagline}</p>
        <div className="ms-chips" role="group" aria-label="Shade for the bags">
          <span className="ms-chips__label">Bag shade</span>
          {SHADES.map((s) => <button key={s.key} type="button" aria-pressed={shade === s.key} onClick={() => { setShade(s.key); setConfirm(null); }}>{s.name}</button>)}
        </div>
        <div className="ms-bags">
          {bagButton('full', true)}
          {bagButton('starter', false)}
        </div>
        {confirm && <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" style={{ justifySelf: 'start' }} onClick={() => setConfirm(null)}>Cancel</button>}
        {msg && <div className={`ms-msg${msg.ok ? '' : ' ms-msg--bad'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}{msg.ok && <> <Link to="/bag">Marble Bag</Link></>}</div>}
      </div>
      <div className="ms-hero__balls">
        {heroBalls.map((s, k) => <MarbleBadge key={s} slug={s} size={k === 1 ? 150 : 110} label={`${ITEM[s].design.name}, ${ITEM[s].shade.name}`} />)}
      </div>
    </section>
  );
}

/** The big view: the real 3D marble, its collection, name, Marble ID (Copy ID), story, shade switcher and buying. */
function MarbleSheet({ slug, onSlug, owned, live, buy, onClose }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(null);
  const item = ITEM[slug];
  const d = item.design;
  const info = rarityInfo(item.rarity);
  const have = owned.has(slug);
  const liveItem = live[slug];
  const noPrice = info.price.coins == null;

  useEffect(() => {
    ref.current?.focus();
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow; };
  }, [onClose]);
  useEffect(() => { setConfirming(false); setMessage(null); setCopied(null); }, [slug]);

  const copyId = async () => {
    const text = `#${item.id}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`Copied ${text}`);
    } catch {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('sheet-id'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      setCopied('ID selected: copy it from your keyboard.');
    }
  };
  const onBuy = async () => {
    if (!isAuthenticated) { navigate(`/signup?next=${encodeURIComponent(`/collection/${d.key}?shade=${item.shade.key}`)}`); return; }
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    try {
      const { copy } = await buy(slug);
      setMessage({ ok: true, copy });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return createPortal((
    <div className="ms-sheet" onClick={onClose} role="presentation">
      <div className="ms-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-name" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ms-sheet__close" onClick={onClose} aria-label="Close">×</button>
        <div className="ms-sheet__ball">
          {/* The 3D marble only once its look is approved; until then the shop picture, in the shade chosen (never a stand-in). */}
          {shows3d(slug) ? (
            <Suspense fallback={<MarbleBadge key={slug} slug={slug} size={170} still />}>
              <Turntable key={slug} slug={slug} label={`${d.name}, ${item.shade.name}, in 3D`} />
            </Suspense>
          ) : <MarbleBadge key={slug} slug={slug} size={170} label={`${d.name}, ${item.shade.name}`} />}
        </div>
        <span className="ms-mcard__rarity" style={{ color: info.colour, margin: 0 }}>{info.label} · {priceLabel(info.price)}</span>
        <span className="ms-sheet__col">{item.collection.toUpperCase()}{d.limited ? '' : ` · COLLECTION ${COLLECTION.number}`}</span>
        <h2 id="sheet-name" className="ms-sheet__name">{d.name}</h2>
        <div className="ms-row" style={{ justifyContent: 'center', gap: 8 }}>
          <span className="ms-id ms-id--big" id="sheet-id">#{item.id}</span>
          <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={copyId}>Copy ID</button>
        </div>
        {copied && <span className="ms-note" aria-live="polite">{copied}</span>}
        <p className="ms-sheet__story">{d.story}</p>
        {d.shades.length > 1 && (
          <div className="ms-sheet__shades" role="group" aria-label="Choose a shade">
            {d.shades.map((s) => {
              const sSlug = `${d.key}-${s.key}`;
              return (
                <button key={s.key} type="button" aria-pressed={sSlug === slug} aria-label={`${s.name}${owned.has(sSlug) ? ', owned' : ''}`} onClick={() => onSlug(sSlug)}>
                  <MarbleBadge slug={sSlug} size={44} still />
                </button>
              );
            })}
          </div>
        )}
        <span style={{ fontWeight: 700, color: 'var(--ms-soft)' }}>Shade: {item.shade.name}{item.shade.original ? ' (the original)' : ''}</span>
        <span className="ms-note" style={{ textAlign: 'center' }}>{item.shade.description} <b style={{ color: 'var(--ms-soft)' }}>In races:</b> {d.inRaces}</span>
        <span className="ms-mcard__fe">{editionLine(liveItem, item.editionSize)}</span>
        {message?.ok && (
          <div className="ms-msg" role="status">
            It's yours: <b>{d.name} · {item.shade.name}</b>{message.copy.editionNo ? <>, First Edition <b>#{String(message.copy.editionNo).padStart(3, '0')}</b></> : null}.{' '}
            <Link to={`/certificate/${message.copy.marbleCode}`}>Certificate</Link> · <Link to="/bag">Marble Bag</Link>
          </div>
        )}
        {message && !message.ok && <div className="ms-msg ms-msg--bad" role="alert">{message.text}</div>}
        {have ? (
          <span className="ms-btn ms-sheet__buy" aria-disabled="true">OWNED</span>
        ) : liveItem && !liveItem.onSale ? (
          <span className="ms-btn ms-sheet__buy" aria-disabled="true">NO LONGER FOR SALE</span>
        ) : noPrice ? (
          <span className="ms-btn ms-sheet__buy" aria-disabled="true">PRICE COMING SOON</span>
        ) : (
          <>
            <button type="button" className="ms-btn ms-btn--primary ms-sheet__buy" onClick={onBuy} disabled={busy}>
              {busy ? 'BUYING…' : `${confirming ? 'CONFIRM: ' : 'BUY FOR '}${priceLabel(info.price).replace(/^[●◆] /, '').toUpperCase()}`}
            </button>
            {confirming && <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={() => setConfirming(false)}>Cancel</button>}
            {isAuthenticated && <span className="ms-note">You have {(user?.coins ?? 0).toLocaleString('en-US')} coins.</span>}
          </>
        )}
      </div>
    </div>
  ), document.body);
}

/** The next collections, their dates and three of their marbles (the first stays a secret). */
function ComingSoon() {
  const list = catalog.comingSoon ?? [];
  if (!list.length) return null;
  return (
    <section aria-labelledby="soon-h" style={{ display: 'grid', gap: 14 }}>
      <div className="ms-section-head" style={{ justifyContent: 'space-between' }}><h2 id="soon-h">Coming soon</h2><span>A new collection every week</span></div>
      <div className="ms-soon">
        {list.map((c) => (
          <article key={c.code} className="ms-soon__card">
            <span className="ms-soon__date">{DATE.format(new Date(`${c.date}T12:00:00Z`)).toUpperCase()}</span>
            <h3>{c.name}</h3>
            <div className="ms-row" style={{ gap: 10 }}>
              {(TEASERS[c.code] ?? []).map((t) => (
                <span key={t.name} className="ms-m" style={{ width: 56, height: 56, boxShadow: t.glow ? `0 0 14px ${t.glow}, 0 8px 14px rgba(0,0,0,0.45)` : '0 8px 14px rgba(0,0,0,0.45)', filter: t.secret ? 'brightness(0.15) blur(0.5px)' : undefined }} role="img" aria-label={t.secret ? 'A secret marble' : t.name}>
                  <i style={{ background: t.bg }} /><i style={{ background: GLOSS }} />
                </span>
              ))}
            </div>
            <p>{c.blurb}</p>
            <span className="ms-note">Collection {c.number} · 10 marbles · 50 with shades · IDs {c.code}011–{c.code}105 · the first one stays secret</span>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Coin packs, bought with real money (client/src/shared/payments/packs.json). Racing earns coins too. */
function CoinPacks() {
  const { isAuthenticated } = useAuth();
  const race = economy.race;
  return (
    <section id="coins" aria-labelledby="coins-h" style={{ display: 'grid', gap: 14 }}>
      <div className="ms-section-head">
        <h2 id="coins-h">Coin packs</h2>
        <span>Coins are earned by racing or bought here. Every race pays {race.takingPart} for taking part, the top 3 get {race.places.slice(0, 3).map((p) => p.coins).join(' / ')} more, and the daily goal of {economy.dailyGoal.races} races adds {economy.dailyGoal.coins}.</span>
      </div>
      <div className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))' }}>
        {COIN_PACKS.map((p) => (
          <Link key={p.id} to={isAuthenticated ? `/checkout?pack=${p.id}` : `/signup?next=${encodeURIComponent(`/checkout?pack=${p.id}`)}`} className="ms-mcard" style={{ padding: 18, borderColor: p.popular ? 'var(--ms-yellow)' : undefined }}>
            <span className="ms-coins" style={{ fontSize: '1.8rem' }}>● {p.coins.toLocaleString('en-US')}</span>
            <span style={{ color: 'var(--ms-soft)' }}>coins{p.popular ? ' · most popular' : ''}</span>
            <span className="ms-price-btn">{p.priceLabel}</span>
          </Link>
        ))}
      </div>
      <p className="ms-note">Coins are for the shop only and can't be cashed out. Prices shown in your local currency at checkout, including VAT. Under 18? Ask a parent or guardian before buying. <Link to="/legal#sale">Terms of sale</Link> · <Link to="/help#buying-coins">Help with buying coins</Link> · <Link to="/help#contact">Contact us</Link></p>
    </section>
  );
}
