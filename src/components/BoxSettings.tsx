import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { boxSupported, checkBox, deviceKeyInfo, indexStats, type BoxResult, type DeviceKeyInfo } from '../lib/box';
import { href, paths } from '../lib/router';
import { formatDate, formatNumber } from '../lib/format';

/** Ayarlar › Plan kutusu: cihaz anahtarı (kopyala, parmak izi), kutuyu denetle, açıklık notu. */
export function BoxSettings({ onToast }: { onToast: (t: string) => void }) {
  const [info, setInfo] = useState<DeviceKeyInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<BoxResult | null>(null);
  useEffect(() => {
    deviceKeyInfo().then(setInfo);
  }, []);
  if (!boxSupported() || info === null)
    return (
      <section className="settings-group" data-testid="box-settings">
        <h2 className="section-title">{tr.box.title}</h2>
        <p className="note small">{tr.box.unsupported}</p>
      </section>
    );
  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.text);
    } catch {
      const t = document.querySelector<HTMLTextAreaElement>('[data-testid="box-key"]');
      t?.select();
      document.execCommand?.('copy');
    }
    onToast(tr.box.copied);
  };
  const check = async () => {
    setBusy(true);
    try {
      setRes(await checkBox());
    } finally {
      setBusy(false);
    }
  };
  const st = indexStats(res?.index ?? null);
  return (
    <section className="settings-group" data-testid="box-settings">
      <h2 className="section-title">{tr.box.title}</h2>
      <p className="small">{tr.box.intro}</p>
      {info && (
        <>
          <label className="field">
            <span>{tr.box.keyLabel}</span>
            <textarea className="text-input mono key-text" readOnly rows={3} value={info.text} data-testid="box-key" onFocus={(e) => e.currentTarget.select()} />
          </label>
          <div className="row">
            <button className="btn btn-primary btn-small" onClick={copy} data-testid="box-copy">
              {tr.box.copy}
            </button>
            <span className="small muted" data-testid="box-fp">
              {tr.box.fingerprint(info.fpShown)}
            </span>
          </div>
          {info.regenerated && (
            <p className="note small" data-testid="box-new-key">
              {tr.box.newKey}
            </p>
          )}
        </>
      )}
      <div className="row">
        <button className="btn btn-small" onClick={check} disabled={busy} data-testid="box-check">
          {busy ? tr.box.checking : tr.box.check}
        </button>
        <a className="btn btn-small btn-ghost" href={href(paths.request())} data-testid="box-request">
          {tr.box.request}
        </a>
      </div>
      {res && (
        <p className="small" role="status" data-testid="box-result">
          {res.state === 'offline' ? tr.box.offline : res.state === 'fail' ? tr.box.fail : res.state === 'unsupported' ? tr.box.unsupported : tr.box.checked(res.events.length)}
          {res.errors.includes('bad') && ` ${tr.box.bad}`}
          {res.errors.includes('invalid') && ` ${tr.box.invalid}`}
        </p>
      )}
      <p className="small muted" data-testid="box-openness">
        {res?.index ? tr.box.openness(st.files, `${formatNumber(Math.round(st.bytes / 1024))} KB`, st.at ? formatDate(st.at.slice(0, 10)) : '—') : tr.box.opennessNone}
      </p>
    </section>
  );
}
