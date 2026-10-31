// The save reminder when a guest buys with coins (Moses, 31 Oct 2026): a reminder, never a block.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GUEST_BUY } from '../src/site/account/GuestBuyReminder';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const REMINDER = src('src/site/account/GuestBuyReminder.jsx');
const SHOP = src('src/site/pages/ShopPage.jsx');
const PICKER = src('src/components/MarbleSelector.jsx');

describe('guests buying with coins: the save reminder', () => {
  it('the texts, as Moses wrote them', () => {
    expect(GUEST_BUY.before).toBe("You're playing as a guest. Save your account so this marble is yours forever.");
    expect(GUEST_BUY.after('Champion Shooter')).toBe('Champion Shooter is yours! Save your account so you never lose it.');
    expect(GUEST_BUY.beforeBag).toBe("You're playing as a guest. Save your account so these marbles are yours forever.");
  });
  it('before: SAVE MY ACCOUNT (the quick sign-up, then the purchase) and BUY ANYWAY, which always buys', () => {
    expect(REMINDER).toContain('>SAVE MY ACCOUNT</button>');
    expect(REMINDER).toContain("onClick={() => onBuy()} disabled={busy}>{busy ? 'BUYING…' : 'BUY ANYWAY'}</button>");
    expect(REMINDER).toContain('onSaved={() => onBuy()}');
  });
  it('after: SAVE and LATER, which always closes it; guests only', () => {
    expect(REMINDER).toContain(">SAVE</button>");
    expect(REMINDER).toContain("onClick={() => setState('later')}>LATER</button>");
    expect(REMINDER.match(/if \(!user\?\.is_guest\) return null;/g)).toHaveLength(2);
  });
  it('in the shop (a marble and the bags) and the race page\'s marble picker; saved accounts keep the confirm button', () => {
    expect(SHOP).toContain('{confirming && guest ? <GuestBuyBefore onBuy={doBuy} busy={busy} /> : (');
    expect(SHOP).toContain('{message?.ok && <GuestBuyAfter name={d.name} />}');
    expect(SHOP).toContain('{confirm && guest && <GuestBuyBefore onBuy={() => buyBag(confirm, true)} busy={busy} text={GUEST_BUY.beforeBag} />}');
    expect(SHOP).toContain('{msg?.ok && msg.bought && <GuestBuyAfter name={`The ${msg.bought}`} />}');
    expect(PICKER).toContain('{tab === \'shop\' && affordable && asking === m.id && <GuestBuyBefore onBuy={() => buy(m)} busy={buying === m.id} />}');
    expect(PICKER).toContain('{bought && <GuestBuyAfter name={bought} />}');
  });
});
