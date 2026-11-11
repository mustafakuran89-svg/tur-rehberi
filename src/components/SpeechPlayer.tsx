import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { findVoice, onSpeechStopped, onVoicesChanged, pauseSpeaking, resumeSpeaking, speak, speechSupported, stopSpeaking, voicesKnown } from '../lib/speech';
import { RATE_OPTIONS, setSettings, useSettings } from '../lib/settings';
import { formatNumber } from '../lib/format';

/**
 * Ses oynatıcı: oynat, duraklat, devam, hız. Kısa anlatım varsa "Kısa dinle" ve "Uzun dinle"
 * ayrı düğmelerdir; yoksa tek "Dinle". Video başlayınca (stopSpeaking) oynatıcı durur.
 */
export function SpeechPlayer({ text, short, lang = 'tr-TR' }: { text: string; short?: string | null; lang?: string }) {
  const settings = useSettings();
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [hasVoice, setHasVoice] = useState(true);

  useEffect(() => onVoicesChanged(() => setHasVoice(!voicesKnown() || !!findVoice(lang))), [lang]);
  useEffect(() => onSpeechStopped(() => setState('idle')), []);
  useEffect(() => () => stopSpeaking(), []);

  if (!speechSupported()) return <p className="note">{tr.player.unsupported}</p>;

  const play = (t: string) => {
    setState('playing');
    speak(t, lang, settings.rate, { onEnd: () => setState('idle'), onError: () => setState('idle') });
  };
  const hasShort = !!short?.trim();

  return (
    <div className="player" data-testid="player">
      {state === 'idle' && (
        <>
          {hasShort && (
            <button className="btn btn-primary btn-big" onClick={() => play(short!)} data-testid="play-short">
              ▶ {tr.look.listenShort}
            </button>
          )}
          <button className={`btn btn-big ${hasShort ? '' : 'btn-primary'}`} onClick={() => play(text)} data-testid="play">
            ▶ {hasShort ? tr.look.listenLong : tr.player.play}
          </button>
        </>
      )}
      {state === 'playing' && (
        <>
          <button className="btn btn-primary btn-big" onClick={() => { pauseSpeaking(); setState('paused'); }} data-testid="pause">
            ❚❚ {tr.player.pause}
          </button>
          <button className="btn btn-ghost" onClick={() => stopSpeaking()} data-testid="stop">
            ■ {tr.player.stop}
          </button>
        </>
      )}
      {state === 'paused' && (
        <>
          <button className="btn btn-primary btn-big" onClick={() => { resumeSpeaking(); setState('playing'); }} data-testid="resume">
            ▶ {tr.player.resume}
          </button>
          <button className="btn btn-ghost" onClick={() => stopSpeaking()}>
            ■ {tr.player.stop}
          </button>
        </>
      )}
      <label className="rate">
        {tr.player.rate}{' '}
        <select
          value={settings.rate}
          onChange={(e) => {
            setSettings({ rate: Number(e.target.value) });
            if (state !== 'idle') stopSpeaking();
          }}
        >
          {RATE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {formatNumber(r)}×
            </option>
          ))}
        </select>
      </label>
      {!hasVoice && <p className="note">{lang.startsWith('tr') ? tr.player.noVoice : tr.player.noVoiceLang(lang)}</p>}
    </div>
  );
}
