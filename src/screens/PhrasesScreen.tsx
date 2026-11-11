import { useEffect, useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import { paths } from '../lib/router';
import { findVoice, onVoicesChanged, speak, speechSupported, stopSpeaking, voicesKnown } from '../lib/speech';
import { useSettings } from '../lib/settings';
import { Header, Loading, Missing, SampleBadge, Warnings, useTrip } from '../components/ui';

export function PhrasesScreen({ tripKey }: { tripKey: string }) {
  const { rec } = useTrip(tripKey);
  const settings = useSettings();
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [, setVoicesTick] = useState(0);
  useEffect(() => onVoicesChanged(() => setVoicesTick((x) => x + 1)), []);
  useEffect(() => () => stopSpeaking(), []);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.rule === 'phrase-count' || w.rule === 'phrase-fields') : []), [rec]);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const t = rec.trip;
  return (
    <div className="page">
      <Header title={tr.phrases.title} back={paths.summary(tripKey)} kicker={<>{t.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="muted">{tr.phrases.tapToHear}</p>
        <Warnings items={warnings} title={tr.summary.warnings} />
        {t.phrases.length === 0 && <p>{tr.phrases.none}</p>}
        {t.phrases.map((list, li) => (
          <section key={li}>
            <h2 className="section-title">{list.language}</h2>
            {voicesKnown() && !findVoice(list.langCode) && <p className="note small">{tr.player.noVoiceLang(list.language)}</p>}
            <ul className="phrases">
              {list.items.map((p, i) => {
                const id = `${li}-${i}`;
                return (
                  <li key={i}>
                    <button
                      className={`phrase${speaking === id ? ' speaking' : ''}`}
                      data-testid="phrase"
                      disabled={!speechSupported()}
                      onClick={() => {
                        setSpeaking(id);
                        speak(p.script || p.original, list.langCode, settings.rate, { onEnd: () => setSpeaking(null), onError: () => setSpeaking(null) });
                      }}
                    >
                      <span className="ph-orig">
                        🔊 {p.original}
                        {p.script && <span className="ph-script"> {p.script}</span>}
                      </span>
                      <span className="ph-pron">
                        {tr.phrases.pronunciation}: {p.pronunciationTr}
                      </span>
                      <span className="ph-mean">{p.meaning}</span>
                      {p.context && <span className="ph-ctx">{p.context}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
