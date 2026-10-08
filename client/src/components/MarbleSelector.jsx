import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { formatNumber } from '../utils/format';
import MarbleBall from './MarbleBall';
import { ErrorMessage, Spinner } from './Status';

/** A marble's own history with you: races, wins and podiums with it as your Shooter. */
function history(m) {
  if (!m.my_races) return 'Not raced yet';
  const n = (k, word) => `${formatNumber(k)} ${word}${k === 1 ? '' : 's'}`;
  return `${n(m.my_races, 'race')} · ${n(m.my_wins, 'win')} · ${n(m.my_podiums, 'podium')}`;
}

/**
 * Pick your Shooter from your Marble Bag (owned + free starters). The shop tab
 * lists the rest of the catalog with a buy button. Marbles are looks only:
 * every marble in the bag races at the player's own skill.
 *
 * Props: value (marble id), onChange(marble), disabledIds (already in race)
 */
export default function MarbleSelector({ value, onChange, disabledIds = [] }) {
  const { user, setCoins } = useAuth();
  const { data, error, loading, reload } = useAsync(() => api.marbles(), [user?.id]);
  const [tab, setTab] = useState('mine');
  const [buying, setBuying] = useState(null);
  const [buyError, setBuyError] = useState(null);

  const { mine, shop } = useMemo(() => {
    const all = data?.marbles ?? [];
    return { mine: all.filter((m) => m.owned), shop: all.filter((m) => !m.owned) };
  }, [data]);

  async function buy(marble) {
    setBuying(marble.id);
    setBuyError(null);
    try {
      const res = await api.purchaseMarble(marble.id);
      setCoins(res.coins);
      await reload();
      setTab('mine');
      onChange?.(marble);
    } catch (err) {
      setBuyError(err.message);
    } finally {
      setBuying(null);
    }
  }

  if (loading && !data) return <Spinner label="Loading marbles…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const list = tab === 'mine' ? mine : shop;

  return (
    <div className="marble-selector">
      <div className="segmented segmented--sm" role="tablist" aria-label="Marble Bag and shop">
        <button type="button" role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
          Marble Bag ({mine.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'shop'} onClick={() => setTab('shop')}>
          Shop ({shop.length})
        </button>
      </div>
      <p className="muted marble-selector__note">
        {tab === 'mine'
          ? `Every marble in your bag races at your skill${user?.skill ? ` (${user.skill})` : ''}: pick the look you like as your Shooter.`
          : 'Marbles are sold for their looks only: they never change how fast you race.'}
      </p>
      {buyError && <p className="error">{buyError}</p>}

      <div className="marble-grid" role={tab === 'mine' ? 'radiogroup' : undefined} aria-label="Choose your Shooter">
        {list.map((m) => {
          const taken = disabledIds.includes(m.id);
          const selected = value === m.id;
          const affordable = (user?.coins ?? 0) >= m.price_coins;
          return (
            <div
              key={m.id}
              className={`marble-card rarity--${m.rarity}${selected ? ' is-selected' : ''}${taken ? ' is-disabled' : ''}`}
              role={tab === 'mine' ? 'radio' : undefined}
              aria-checked={tab === 'mine' ? selected : undefined}
              aria-disabled={taken || undefined}
              tabIndex={tab === 'mine' && !taken ? 0 : undefined}
              onClick={() => tab === 'mine' && !taken && onChange?.(m)}
              onKeyDown={(e) => {
                if (tab === 'mine' && !taken && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onChange?.(m);
                }
              }}
            >
              <div className="marble-card__head">
                <MarbleBall marble={m} size={36} />
                <div>
                  <strong>{m.name}</strong>
                  <small className={`rarity-label rarity-label--${m.rarity}`}>{m.rarity}</small>
                </div>
              </div>
              {m.description && <p className="marble-card__desc">{m.description}</p>}
              {tab === 'mine' && <small className="marble-card__history">{selected ? 'Your Shooter · ' : ''}{history(m)}</small>}
              {taken && <small className="muted">Already in this race</small>}
              {tab === 'shop' && (
                <button
                  type="button"
                  className="btn btn--sm btn--block"
                  disabled={!affordable || buying === m.id}
                  onClick={() => buy(m)}
                >
                  {buying === m.id ? 'Buying…' : `Buy · ${formatNumber(m.price_coins)} coins`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
