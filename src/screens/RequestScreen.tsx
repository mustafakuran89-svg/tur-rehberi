import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { paths } from '../lib/router';
import { deviceKeyInfo } from '../lib/box';
import { plannerText } from '../lib/planner';
import { Header, Toast, useToast } from '../components/ui';

/**
 * Yeni gezi iste: form bir istek metni üretir; metne cihazın anahtar parmak izi (ve istenirse
 * kaydedilen yerlerin listesi) eklenir. Uygulama hiçbir yere göndermez: paylaşım menüsü ya da pano.
 */
export function RequestScreen() {
  const [f, setF] = useState({ place: '', start: '', end: '', hotel: '', arrival: '', departure: '', wishes: '' });
  const [withSaved, setWithSaved] = useState(true);
  const [fp, setFp] = useState('');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState('');
  const [toast, showToast] = useToast();
  useEffect(() => {
    deviceKeyInfo().then((i) => {
      setFp(i?.fpShown ?? '');
      setKey(i?.text ?? '');
    });
    plannerText(null).then(setSaved);
  }, []);
  const text = [
    `${tr.box.requestTitle}`,
    `${tr.box.reqPlace}: ${f.place}`,
    `${tr.box.reqStart}: ${f.start}  ${tr.box.reqEnd}: ${f.end}`,
    f.hotel && `${tr.box.reqHotel}: ${f.hotel}`,
    f.arrival && `${tr.box.reqArrival}: ${f.arrival}`,
    f.departure && `${tr.box.reqDeparture}: ${f.departure}`,
    f.wishes && `${tr.box.reqWishes}: ${f.wishes}`,
    fp && tr.box.fingerprint(fp),
    key && key,
    withSaved && saved ? `\n${saved}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const field = (k: keyof typeof f, label: string, type = 'text') => (
    <label className="field">
      <span>{label}</span>
      {k === 'wishes' ? (
        <textarea className="text-input" rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`req-${k}`} />
      ) : (
        <input className="text-input" type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`req-${k}`} />
      )}
    </label>
  );
  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: tr.box.requestTitle, text });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    await copy();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* yok say */
    }
    showToast(tr.saved.copied);
  };
  return (
    <div className="page">
      <Header title={tr.box.requestTitle} back={paths.settings()} />
      <main className="content">
        <p className="small">{tr.box.requestIntro}</p>
        {field('place', tr.box.reqPlace)}
        {field('start', tr.box.reqStart, 'date')}
        {field('end', tr.box.reqEnd, 'date')}
        {field('hotel', tr.box.reqHotel)}
        {field('arrival', tr.box.reqArrival)}
        {field('departure', tr.box.reqDeparture)}
        {field('wishes', tr.box.reqWishes)}
        {saved && (
          <label className="field check">
            <input type="checkbox" checked={withSaved} onChange={(e) => setWithSaved(e.target.checked)} />
            <span>{tr.box.reqIncludeSaved}</span>
          </label>
        )}
        <label className="field">
          <span>{tr.box.reqText}</span>
          <textarea className="text-input" rows={8} readOnly value={text} data-testid="req-text" />
        </label>
        <div className="row">
          <button className="btn btn-primary" onClick={share} data-testid="req-share">
            {tr.box.reqShare}
          </button>
          <button className="btn" onClick={copy} data-testid="req-copy">
            {tr.box.reqCopy}
          </button>
        </div>
      </main>
      <Toast text={toast} />
    </div>
  );
}
