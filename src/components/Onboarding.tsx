import { useState } from 'react';
import { tr } from '../i18n/tr';

// Uygulamayı tanıtan ipuçları (Geliştirme 4, Aşama C.4): ilk kullanımda birkaç kısa kart.
// Kapatılabilir; Ayarlar'dan yeniden açılır. Yalnız bu cihazda (localStorage) hatırlanır.
const KEY = 'tur-rehberi:onboarding';

function readClosed(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[];
  } catch {
    return [];
  }
}
function writeClosed(x: number[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(x));
  } catch {
    /* yok say */
  }
}
export function reopenOnboarding(): void {
  writeClosed([]);
}

export function Onboarding() {
  const [closed, setClosed] = useState<number[]>(readClosed);
  const items = tr.onboarding.items.map((x, i) => ({ i, title: x[0], text: x[1] })).filter((x) => !closed.includes(x.i));
  if (!items.length) return null;
  const close = (ids: number[]) => {
    const next = [...new Set([...closed, ...ids])];
    writeClosed(next);
    setClosed(next);
  };
  return (
    <section className="onboarding" data-testid="onboarding" aria-label={tr.onboarding.title}>
      <div className="row between">
        <h2 className="section-title">{tr.onboarding.title}</h2>
        <button className="btn btn-small btn-ghost" onClick={() => close(items.map((x) => x.i))} data-testid="onboarding-close-all">
          {tr.onboarding.closeAll}
        </button>
      </div>
      <ul className="plain onboarding-list">
        {items.map((x) => (
          <li key={x.i} className="card" data-testid="onboarding-card">
            <h3>{x.title}</h3>
            <p className="small">{x.text}</p>
            <button className="btn btn-small btn-ghost" onClick={() => close([x.i])} aria-label={`${tr.onboarding.close}: ${x.title}`}>
              {tr.onboarding.close}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
