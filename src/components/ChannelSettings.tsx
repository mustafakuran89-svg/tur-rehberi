import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { setSettings, useSettings } from '../lib/settings';
import { cachedIndexes, channelKey, parseChannelInput, sameChannel, type ChannelIndex } from '../lib/channels';
import { formatDate, formatNumber } from '../lib/format';

/** Ayarlar › Öncelikli rehber kanalları: sıralı liste; bağlantı ya da @ad ile ekle, sırala, sil. */
export function ChannelSettings() {
  const s = useSettings();
  const [val, setVal] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ix, setIx] = useState<(ChannelIndex | null)[]>([]);
  const key = s.channels.map(channelKey).join('|');
  useEffect(() => {
    cachedIndexes(s.channels).then(setIx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const add = () => {
    const c = parseChannelInput(val);
    if (!c) return setErr(tr.channels.bad);
    if (s.channels.some((x) => sameChannel(x, c))) return setErr(tr.channels.exists);
    setErr(null);
    setVal('');
    setSettings({ channels: [...s.channels, c] });
  };
  const move = (i: number, d: -1 | 1) => {
    const list = [...s.channels];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setSettings({ channels: list });
  };

  return (
    <section className="settings-group" data-testid="channel-settings">
      <h2 className="section-title">{tr.channels.title}</h2>
      <p className="small">{tr.channels.intro}</p>
      {s.channels.length === 0 ? (
        <p className="muted small">{tr.channels.empty}</p>
      ) : (
        <ol className="channel-list">
          {s.channels.map((c, i) => (
            <li key={channelKey(c)} data-testid="channel-row">
              <div>
                <strong data-testid="channel-name">{ix[i]?.title ?? c.title}</strong>
                {c.handle && <span className="small muted"> {c.handle}</span>}
                <div className="small muted">{ix[i] ? tr.channels.indexed(formatNumber(ix[i]!.videos.length), formatDate(ix[i]!.fetchedAt)) : tr.channels.notIndexed}</div>
              </div>
              <div className="row">
                <button className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${tr.channels.up}: ${c.title}`} data-testid="channel-up">
                  ↑
                </button>
                <button className="btn btn-small btn-ghost" disabled={i === s.channels.length - 1} onClick={() => move(i, 1)} aria-label={`${tr.channels.down}: ${c.title}`} data-testid="channel-down">
                  ↓
                </button>
                <button className="btn btn-small btn-danger" onClick={() => setSettings({ channels: s.channels.filter((_, j) => j !== i) })} aria-label={`${tr.channels.remove}: ${c.title}`} data-testid="channel-remove">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="row">
        <input className="text-input" value={val} placeholder={tr.channels.addPh} aria-label={tr.channels.addLabel} onChange={(e) => setVal(e.target.value)} data-testid="channel-input" />
        <button className="btn btn-small btn-primary" disabled={!val.trim()} onClick={add} data-testid="channel-add">
          {tr.channels.add}
        </button>
      </div>
      {err && <p className="error small">{err}</p>}
    </section>
  );
}
