import { useState } from 'react';
import { Check, Gem, Palette, Snowflake } from 'lucide-react';
import { sfx } from '../audio/synth';
import { Mascot } from '../components/Mascot';
import { FREEZE_PRICE, MAX_FREEZES, useGame, type AccentId } from '../game/store';
import './Shop.css';

const ACCENTS: { id: AccentId; name: string; price: number; swatch: string; blurb: string }[] = [
  { id: 'ember', name: 'Ember', price: 0, swatch: '#ff7d47', blurb: 'The classic Belto glow.' },
  { id: 'lagoon', name: 'Lagoon', price: 100, swatch: '#2fc7d8', blurb: 'Cool, calm, crystal clear.' },
  { id: 'orchid', name: 'Orchid', price: 100, swatch: '#ee6fd8', blurb: 'For the drama in your voice.' },
  { id: 'citrus', name: 'Citrus', price: 150, swatch: '#a6e04a', blurb: 'Zesty and wide awake.' },
];

export function Shop() {
  const gems = useGame((s) => s.gems);
  const freezes = useGame((s) => s.freezes);
  const owned = useGame((s) => s.ownedAccents);
  const accent = useGame((s) => s.accent);
  const buyFreeze = useGame((s) => s.buyFreeze);
  const buyAccent = useGame((s) => s.buyAccent);
  const [flash, setFlash] = useState<string | null>(null);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2200);
  };

  return (
    <div className="shop">
      <header className="shop__head card">
        <Mascot mood="wow" size={110} />
        <div>
          <p className="eyebrow">Gem shop</p>
          <h1 className="shop__title">
            <Gem size={34} className="shop__gem" /> <span className="num">{gems}</span>
          </h1>
          <p className="dim">Earn gems from lessons, quests, chests and the league podium.</p>
        </div>
      </header>
      {flash && (
        <p className="shop__flash pop-in" role="status">
          {flash}
        </p>
      )}

      <section className="card shop__item">
        <span className="shop__icon shop__icon--ice">
          <Snowflake size={30} />
        </span>
        <div className="shop__body">
          <h2 className="h3">Streak freeze</h2>
          <p className="dim">Miss a day without losing your streak. Used automatically. You can hold up to {MAX_FREEZES}.</p>
          <div className="shop__owned" aria-label={`${freezes} of ${MAX_FREEZES} owned`}>
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <span key={i} data-on={i < freezes}>
                <Snowflake size={14} />
              </span>
            ))}
          </div>
        </div>
        <button
          className="btn btn--teal"
          disabled={freezes >= MAX_FREEZES || gems < FREEZE_PRICE}
          onClick={() => {
            if (buyFreeze()) {
              sfx('gem');
              say('Streak freeze equipped. Your streak is safe!');
            }
          }}
        >
          {freezes >= MAX_FREEZES ? (
            'Full'
          ) : (
            <>
              <Gem size={16} /> {FREEZE_PRICE}
            </>
          )}
        </button>
      </section>

      <section className="card stack">
        <div className="row">
          <Palette size={22} className="shop__palette" />
          <h2 className="h3">Accent themes</h2>
        </div>
        <div className="shop__accents">
          {ACCENTS.map((a) => {
            const has = owned.includes(a.id);
            const on = accent === a.id;
            return (
              <button
                key={a.id}
                className={`accent-card ${on ? 'is-on' : ''}`}
                style={{ ['--sw' as string]: a.swatch }}
                onClick={() => {
                  if (on) return;
                  if (has || gems >= a.price) {
                    buyAccent(a.id, a.price);
                    sfx(has ? 'pop' : 'gem');
                    say(has ? `${a.name} equipped.` : `${a.name} unlocked!`);
                  } else {
                    sfx('soft');
                    say(`You need ${a.price - gems} more gems for ${a.name}.`);
                  }
                }}
              >
                <span className="accent-card__swatch">
                  <span />
                  <span />
                  <span />
                </span>
                <strong>{a.name}</strong>
                <span className="mute">{a.blurb}</span>
                <span className="accent-card__price">
                  {on ? (
                    <>
                      <Check size={14} /> Equipped
                    </>
                  ) : has ? (
                    'Owned · equip'
                  ) : (
                    <>
                      <Gem size={14} /> {a.price}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
