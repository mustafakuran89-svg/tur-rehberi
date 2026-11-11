import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { findVoice, onVoicesChanged, pauseSpeaking, resumeSpeaking, speak, speechSupported, stopSpeaking, voicesKnown } from '../lib/speech';
import { RATE_OPTIONS, setSettings, useSettings } from '../lib/settings';
import { formatNumber } from '../lib/format';

/** Ses oynatıcı: oynat, duraklat, devam, hız. Metni cihazın Türkçe sesiyle okur. */
export function SpeechPlayer({ text, lang = 'tr-TR' }: { text: string; lang?: string }) {
  const settings = useSettings();
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [hasVoice, setHasVoice] = useState(true);

  useEffect(() => onVoicesChanged(() => setHasVoice(!voicesKnown() || !!findVoice(lang))), [lang]);
  useEffect(() => () => stopSpeaking(), []);

  if (!speechSupported()) return <p className="note">{tr.player.unsupported}</p>;

  const play = () => {
    setState('playing');
    speak(text, lang, settings.rate, { onEnd: () => setState('idle'), onError: () => setState('idle') });
  };

  return (
    <div className="player" data-testid="player">
      {state === 'idle' && (
        <button className="btn btn-primary btn-big" onClick={play} data-testid="play">
          ▶ {tr.player.play}
        </button>
      )}
      {state === 'playing' && (
        <>
          <button className="btn btn-primary btn-big" onClick={() => { pauseSpeaking(); setState('paused'); }} data-testid="pause">
            ❚❚ {tr.player.pause}
          </button>
          <button className="btn btn-ghost" onClick={() => { stopSpeaking(); setState('idle'); }}>
            ■ {tr.player.stop}
          </button>
        </>
      )}
      {state === 'paused' && (
        <>
          <button className="btn btn-primary btn-big" onClick={() => { resumeSpeaking(); setState('playing'); }} data-testid="resume">
            ▶ {tr.player.resume}
          </button>
          <button className="btn btn-ghost" onClick={() => { stopSpeaking(); setState('idle'); }}>
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
            if (state !== 'idle') {
              stopSpeaking();
              setState('idle');
            }
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
