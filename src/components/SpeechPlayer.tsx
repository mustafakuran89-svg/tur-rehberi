import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../i18n/tr';
import { findVoice, onSpeechStopped, onVoicesChanged, speakUnits, speechSupported, stopSpeaking, voicesKnown } from '../lib/speech';
import { speechUnits } from '../lib/narration';
import type { Pronunciation } from '../plan/types';

/**
 * Soluklu okuma oynatıcısı (Geliştirme 3): anlatım cümle cümle okunur; oynat, duraklat, sürdür,
 * önceki cümle, sonraki cümle, durdur. Duraklatınca kalınan cümle hatırlanır. Video başlayınca
 * (stopSpeaking) oynatıcı durur. Ses, hız ve perde Ayarlar › Ses bölümündendir.
 */
export function SpeechPlayer({ text, lang = 'tr-TR', pronunciations }: { text: string; lang?: string; pronunciations?: Pronunciation[] | null }) {
  const units = useMemo(() => speechUnits(text), [text]);
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [idx, setIdx] = useState(0);
  const [hasVoice, setHasVoice] = useState(true);
  const stopFn = useRef<(() => void) | null>(null);

  useEffect(() => onVoicesChanged(() => setHasVoice(!voicesKnown() || !!findVoice(lang))), [lang]);
  useEffect(
    () =>
      onSpeechStopped(() => {
        setState((s) => (s === 'playing' ? 'paused' : s));
      }),
    [],
  );
  // Metin değişince (kısa ↔ uzun) okuma durur ve başa döner.
  useEffect(() => {
    stopFn.current?.();
    setState('idle');
    setIdx(0);
  }, [text]);
  useEffect(() => () => stopSpeaking(), []);

  if (!speechSupported()) return <p className="note">{tr.player.unsupported}</p>;

  const play = (from: number) => {
    const at = Math.min(Math.max(0, from), Math.max(0, units.length - 1));
    setIdx(at);
    setState('playing');
    stopFn.current = speakUnits(
      units,
      lang,
      { pronunciations },
      {
        onChunk: (i) => setIdx(i),
        onEnd: () => {
          setState('idle');
          setIdx(0);
        },
        onError: () => setState('idle'),
      },
      at,
    );
  };
  const pause = () => {
    stopFn.current?.();
    setState('paused');
  };

  return (
    <div className="player" data-testid="player" data-state={state} data-index={idx}>
      <div className="row">
        {state === 'idle' && (
          <button className="btn btn-primary btn-big" onClick={() => play(0)} data-testid="play">
            ▶ {tr.player.play}
          </button>
        )}
        {state === 'playing' && (
          <button className="btn btn-primary btn-big" onClick={pause} data-testid="pause">
            ❚❚ {tr.player.pause}
          </button>
        )}
        {state === 'paused' && (
          <button className="btn btn-primary btn-big" onClick={() => play(idx)} data-testid="resume">
            ▶ {tr.player.resume}
          </button>
        )}
        {state !== 'idle' && (
          <button
            className="btn btn-ghost"
            data-testid="stop"
            onClick={() => {
              stopFn.current?.();
              setState('idle');
              setIdx(0);
            }}
          >
            ■ {tr.player.stop}
          </button>
        )}
      </div>
      {units.length > 1 && (
        <div className="row sentence-nav">
          <button className="btn btn-small" disabled={idx === 0} onClick={() => play(idx - 1)} data-testid="prev-sentence">
            ⏮ {tr.player.prevSentence}
          </button>
          <span className="small muted" data-testid="sentence-pos">
            {tr.player.sentence(idx + 1, units.length)}
          </span>
          <button className="btn btn-small" disabled={idx >= units.length - 1} onClick={() => play(idx + 1)} data-testid="next-sentence">
            {tr.player.nextSentence} ⏭
          </button>
        </div>
      )}
      {!hasVoice && <p className="note">{lang.startsWith('tr') ? tr.player.noVoice : tr.player.noVoiceLang(lang)}</p>}
    </div>
  );
}
