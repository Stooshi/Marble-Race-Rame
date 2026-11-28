import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ITEM, lookName, rarityInfo } from '../shared/marbles';
import MarbleBall from './MarbleBall';
import ReportName from './ReportName';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/** What a tapped marble is: { name, rarity, colour, shop link or null, note }. */
export function marbleFacts(marble, isBot = false) {
  const item = marble?.look && ITEM[marble.look];
  if (item) {
    const info = rarityInfo(item.rarity);
    return { name: lookName(item.slug), rarity: `${info.label} · ${item.collection} · #${item.id}`, colour: info.colour, shop: `/collection/${item.design.key}?shade=${item.shade.key}`, note: item.design.inRaces };
  }
  if (isBot) return { name: marble?.name ?? 'Computer player', rarity: 'Computer player', colour: 'var(--ms-muted)', shop: null, note: 'A computer player: it fills an empty place so every race is full, and races by the same physics as everyone else.' };
  if (marble?.starter) return { name: marble.name, rarity: marble.code ? `Starter · ${marble.code}` : 'Starter', colour: 'var(--ms-muted)', shop: null, note: "One of this player's own 4 starter marbles: every player gets 4 of their own, each with its own Marble ID." };
  return { name: marble?.name ?? 'Marble', rarity: cap(marble?.rarity) || 'Plain', colour: 'var(--ms-soft)', shop: '/shop', note: 'A plain marble from the shop.' };
}

/**
 * A small card about a marble tapped after a race: its name, rarity and a way
 * to the shop. Closes with the button, Escape or a tap outside.
 */
export default function MarbleInfo({ marble, isBot, onClose, player = null, where = 'results' }) {
  const ref = useRef(null);
  const f = marbleFacts(marble, isBot);
  useEffect(() => {
    ref.current?.focus();
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return createPortal((
    <div className="marble-info__backdrop" onClick={onClose} role="presentation">
      <div className="marble-info" role="dialog" aria-modal="true" aria-label={`${f.name}, ${f.rarity}`} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <MarbleBall marble={marble} size={72} />
        <div className="marble-info__text">
          <b className="marble-info__name">{f.name}</b>
          <span className="marble-info__rarity" style={{ color: f.colour }}>{f.rarity}{isBot && f.rarity !== 'Computer player' ? ' · raced by a computer player' : ''}</span>
          <span className="marble-info__note">{f.note}</span>
          {player?.id && !isBot && <span className="marble-info__owner">Raced by {player.name} <ReportName userId={player.id} name={player.name} where={where} /></span>}
        </div>
        <div className="marble-info__actions">
          {f.shop && <Link to={f.shop} className="ms-btn ms-btn--primary ms-btn--sm" onClick={onClose}>GET IT IN THE SHOP</Link>}
          <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  ), document.body);
}
