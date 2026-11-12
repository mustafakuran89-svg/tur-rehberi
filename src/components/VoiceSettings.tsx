import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { setSettings, useSettings, VOICE_PRESETS, type VoicePreset } from '../lib/settings';
import { onVoicesChanged, resolveVoice, speak, speechSupported, turkishVoices, voicesKnown } from '../lib/speech';
import { formatNumber } from '../lib/format';

/**
 * Ayarlar › Ses: cihazdaki bütün Türkçe sesler (liste geç dolabildiği için değiştikçe yenilenir),
 * her birinin yanında "örnek dinle"; üç hazır ton ve hız/perde sürgüleri.
 */
export function VoiceSettings() {
  const s = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [known, setKnown] = useState(false);
  useEffect(
    () =>
      onVoicesChanged(() => {
        setVoices(turkishVoices());
        setKnown(voicesKnown());
      }),
    [],
  );
  if (!speechSupported()) return <p className="note">{tr.player.unsupported}</p>;
  const active = resolveVoice('tr-TR', s.voiceURI);
  const sample = (voiceURI: string | null) => speak(tr.voice.sampleText, 'tr-TR', { voiceURI, rate: s.rate, pitch: s.pitch });
  const preset = (p: Exclude<VoicePreset, 'custom'>) => setSettings({ voicePreset: p, ...VOICE_PRESETS[p] });

  return (
    <section className="settings-group" data-testid="voice-settings">
      <h2 className="section-title">{tr.voice.title}</h2>
      <p className="small">{tr.voice.intro}</p>
      {!known ? (
        <p className="muted small">{tr.voice.loading}</p>
      ) : voices.length === 0 ? (
        <p className="note small" data-testid="voice-none">
          {tr.voice.none} {tr.player.noVoice}
        </p>
      ) : (
        <ul className="plain voice-list" data-testid="voice-list">
          {voices.map((v) => {
            const on = active?.voiceURI === v.voiceURI;
            return (
              <li key={v.voiceURI} className={`voice-row${on ? ' on' : ''}`} data-testid="voice-row" data-selected={on}>
                <div>
                  <strong>{v.name}</strong>
                  <span className="small muted">
                    {' '}
                    · {v.lang} · {v.localService ? tr.voice.local : tr.voice.network}
                  </span>
                </div>
                <div className="row">
                  <button className="btn btn-small" onClick={() => sample(v.voiceURI)} data-testid="voice-sample">
                    🔊 {tr.voice.sample}
                  </button>
                  {on ? (
                    <span className="badge">{tr.voice.selected}</span>
                  ) : (
                    <button className="btn btn-small btn-ghost" onClick={() => setSettings({ voiceURI: v.voiceURI })} data-testid="voice-choose">
                      {tr.voice.choose}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h3>{tr.voice.presets}</h3>
      <div className="segmented" role="radiogroup" aria-label={tr.voice.presets}>
        {(['soft', 'natural', 'fast'] as const).map((p) => (
          <button key={p} role="radio" aria-checked={s.voicePreset === p} className={`seg${s.voicePreset === p ? ' on' : ''}`} onClick={() => preset(p)} data-testid={`preset-${p}`}>
            {tr.voice.preset[p]}
          </button>
        ))}
      </div>
      <label className="field">
        <span>
          {tr.voice.rate}: {formatNumber(s.rate)}×
        </span>
        <input type="range" min={0.6} max={1.4} step={0.05} value={s.rate} onChange={(e) => setSettings({ rate: Number(e.target.value), voicePreset: 'custom' })} data-testid="rate-slider" />
      </label>
      <label className="field">
        <span>
          {tr.voice.pitch}: {formatNumber(s.pitch)}
        </span>
        <input type="range" min={0.6} max={1.4} step={0.05} value={s.pitch} onChange={(e) => setSettings({ pitch: Number(e.target.value), voicePreset: 'custom' })} data-testid="pitch-slider" />
      </label>
      <button className="btn" onClick={() => sample(s.voiceURI)} data-testid="voice-test">
        🔊 {tr.voice.sample}
      </button>

      <h3>{tr.voice.lengthDefault}</h3>
      <div className="segmented" role="radiogroup" aria-label={tr.voice.lengthDefault}>
        {(['short', 'long'] as const).map((k) => (
          <button key={k} role="radio" aria-checked={s.narrationLength === k} className={`seg${s.narrationLength === k ? ' on' : ''}`} onClick={() => setSettings({ narrationLength: k })} data-testid={`default-${k}`}>
            {k === 'short' ? tr.player.short : tr.player.long}
          </button>
        ))}
      </div>
      <p className="note small">{tr.voice.better}</p>
    </section>
  );
}
