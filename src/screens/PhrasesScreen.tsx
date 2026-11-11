import { useEffect, useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import type { Phrase, Trip } from '../plan/types';
import { paths } from '../lib/router';
import { findVoice, onVoicesChanged, speak, speechSupported, stopSpeaking, voicesKnown } from '../lib/speech';
import { useSettings } from '../lib/settings';
import { Fullscreen } from '../components/v2';
import { Header, Loading, Missing, SampleBadge, Warnings, useTrip } from '../components/ui';

const DIET = ['domuz', 'alkol', 'vejetaryen', 'vegan', 'glüten', 'gluten', 'laktoz', 'süt', 'fıstık', 'yer fıstığı', 'kabuklu', 'deniz ürün', 'alerji', 'helal', 'et yem', 'acı'];
const lower = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Plandaki yeme içme kısıtından üretilen kart: planın varsayım ve notlarında geçen kısıt
 * sözcüğünü anlamında ya da bağlamında taşıyan ifadeler. Kısıt yoksa kart yok.
 */
export function dietPhrases(t: Trip): { list: number; i: number; p: Phrase }[] {
  const text = lower([...t.assumptions, t.notes ?? ''].join(' '));
  const words = DIET.filter((w) => text.includes(w));
  if (!words.length) return [];
  const out: { list: number; i: number; p: Phrase }[] = [];
  t.phrases.forEach((l, li) =>
    l.items.forEach((p, i) => {
      const m = lower(`${p.meaning} ${p.context ?? ''}`);
      if (words.some((w) => m.includes(w))) out.push({ list: li, i, p });
    }),
  );
  return out;
}

export function PhrasesScreen({ tripKey }: { tripKey: string }) {
  const { rec } = useTrip(tripKey);
  const settings = useSettings();
  const [open, setOpen] = useState<{ list: number; i: number } | null>(null);
  const [, setVoicesTick] = useState(0);
  useEffect(() => onVoicesChanged(() => setVoicesTick((x) => x + 1)), []);
  useEffect(() => () => stopSpeaking(), []);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.rule === 'phrase-count' || w.rule === 'phrase-fields') : []), [rec]);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const t = rec.trip;
  const diet = dietPhrases(t);
  const cur = open ? { p: t.phrases[open.list].items[open.i], lang: t.phrases[open.list].langCode } : null;
  const say = (p: Phrase, lang: string) => speak(p.script || p.original, lang, settings.rate);
  const btn = (p: Phrase, li: number, i: number, extra = '') => (
    <button className={`phrase${extra}`} data-testid="phrase" onClick={() => setOpen({ list: li, i })}>
      <span className="ph-orig">
        {p.original}
        {p.script && <span className="ph-script"> {p.script}</span>}
      </span>
      <span className="ph-pron">
        {tr.phrases.pronunciation}: {p.pronunciationTr}
      </span>
      <span className="ph-mean">{p.meaning}</span>
      {p.context && <span className="ph-ctx">{p.context}</span>}
    </button>
  );
  return (
    <div className="page">
      <Header title={tr.phrases.title} back={paths.summary(tripKey)} kicker={<>{t.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        {diet.length > 0 && (
          <section className="diet-card" data-testid="diet-card">
            <h2 className="card-title">{tr.waiter.diet}</h2>
            {diet.map(({ list, i, p }) => (
              <div key={`${list}-${i}`}>{btn(p, list, i, ' diet')}</div>
            ))}
          </section>
        )}
        <p className="muted">{tr.waiter.hint}</p>
        <Warnings items={warnings} title={tr.summary.warnings} />
        {t.phrases.length === 0 && <p>{tr.phrases.none}</p>}
        {t.phrases.map((list, li) => (
          <section key={li}>
            <h2 className="section-title">{list.language}</h2>
            {voicesKnown() && !findVoice(list.langCode) && <p className="note small">{tr.player.noVoiceLang(list.language)}</p>}
            <ul className="phrases">
              {list.items.map((p, i) => (
                <li key={i}>{btn(p, li, i)}</li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      {cur && (
        <Fullscreen onClose={() => setOpen(null)} label={tr.waiter.show} className="fs-text waiter">
          <p className="fs-big" lang={cur.lang} data-testid="waiter-original">
            {cur.p.script || cur.p.original}
          </p>
          {cur.p.script && <p className="fs-sub">{cur.p.original}</p>}
          <p className="fs-sub" data-testid="waiter-meaning">
            {cur.p.meaning}
          </p>
          <button className="btn btn-primary btn-big" onClick={() => say(cur.p, cur.lang)} disabled={!speechSupported()} data-testid="waiter-listen">
            🔊 {tr.waiter.listen}
          </button>
          <p className="small fs-muted">
            {tr.phrases.pronunciation}: {cur.p.pronunciationTr}
          </p>
        </Fullscreen>
      )}
    </div>
  );
}
