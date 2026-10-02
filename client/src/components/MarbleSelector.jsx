import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { formatNumber } from '../utils/format';
import MarbleBall from './MarbleBall';
import { ErrorMessage, Spinner } from './Status';

const STATS = [
  ['top_speed', 'Speed'],
  ['acceleration', 'Accel'],
  ['handling', 'Handling'],
  ['luck', 'Luck'],
];

/**
 * Pick one of your marbles (owned + free starters). The shop tab lists the
 * rest of the catalog with a buy button.
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
      <div className="segmented segmented--sm" role="tablist" aria-label="Marble collection">
        <button type="button" role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
          My marbles ({mine.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'shop'} onClick={() => setTab('shop')}>
          Shop ({shop.length})
        </button>
      </div>
      {buyError && <p className="error">{buyError}</p>}

      <div className="marble-grid" role={tab === 'mine' ? 'radiogroup' : undefined} aria-label="Choose a marble">
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
              <dl className="stat-bars">
                {STATS.map(([key, label]) => (
                  <div key={key} className="stat-bar">
                    <dt>{label}</dt>
                    <dd><span style={{ width: `${m[key]}%` }} /><em>{m[key]}</em></dd>
                  </div>
                ))}
              </dl>
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
