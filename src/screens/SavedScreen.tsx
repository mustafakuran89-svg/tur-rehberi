// Kaydettiklerim (Geliştirme 4, Aşama E.2, E.4, E.9): liste ve harita, her kayda not, rotama ekle,
// kendi yerini ekle (haritaya dokun, harita bağlantısı yapıştır ya da adla ara) ve plancıya gönder.
import { useState } from 'react';
import { tr } from '../i18n/tr';
import { paths } from '../lib/router';
import { updateUserState, type SavedPlace } from '../lib/userState';
import { parseMapLink, searchPlace, googleMapsUrl, type NamedPoint } from '../lib/places';
import { plannerText } from '../lib/planner';
import { addLog } from '../lib/log';
import type { LatLng } from '../lib/geo';
import { TripMap } from '../map/TripMap';
import type { MapPoint } from '../map/types';
import { tripPoints } from '../lib/prepare';
import { AddToRoute } from '../components/AddToRoute';
import { Header, Loading, Missing, SampleBadge, Toast, useToast, useTrip } from '../components/ui';
import { useOnline } from '../lib/online';

function OwnPlaceForm({ tripKey, center, onSaved }: { tripKey: string; center: LatLng | null; onSaved: (p: SavedPlace) => void }) {
  const online = useOnline();
  const [pin, setPin] = useState<LatLng | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [bad, setBad] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<NamedPoint[] | null>(null);
  const save = async () => {
    if (!pin || !name.trim()) return;
    const p: SavedPlace = { key: `o#${Date.now().toString(36)}`, source: 'own', name: name.trim(), lat: +pin.lat.toFixed(6), lng: +pin.lng.toFixed(6), note: note.trim() || undefined, visitMinutes: 20, savedAt: new Date().toISOString() };
    await updateUserState(tripKey, (u) => ({ ...u, saved: { ...(u.saved ?? {}), [p.key]: p } }));
    setPin(null);
    setName('');
    setNote('');
    setLink('');
    onSaved(p);
  };
  return (
    <section className="card own-place" data-testid="own-form">
      <h2 className="card-title">{tr.saved.ownTitle}</h2>
      <p className="small muted">{tr.saved.ownHint}</p>
      <TripMap points={[]} legs={[]} pending={pin} onTap={setPin} height={260} showLegend={false} />
      <p className="small" data-testid="own-picked">
        {pin ? tr.saved.ownPicked(pin.lat.toFixed(5), pin.lng.toFixed(5)) : ''}
      </p>
      <label className="field">
        <span>{tr.saved.ownLink}</span>
        <input
          className="text-input"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            const c = parseMapLink(e.target.value);
            setBad(!!e.target.value.trim() && !c);
            if (c) setPin(c);
          }}
          data-testid="own-link"
        />
      </label>
      {bad && <p className="error small">{tr.saved.ownLinkBad}</p>}
      {online && (
        <div className="row">
          <input className="text-input" value={q} placeholder={tr.saved.ownSearch} aria-label={tr.saved.ownSearch} onChange={(e) => setQ(e.target.value)} data-testid="own-q" />
          <button
            className="btn btn-small"
            disabled={!q.trim()}
            data-testid="own-search"
            onClick={async () => {
              try {
                setHits(await searchPlace(q, center));
              } catch (e) {
                addLog('info', `Yer araması: ${(e as Error).message}`);
                setHits([]);
              }
            }}
          >
            {tr.saved.ownSearch}
          </button>
        </div>
      )}
      {online && <p className="small muted">{tr.saved.ownSearchHint} © OpenStreetMap</p>}
      {hits && (hits.length ? (
        <ul className="plain">
          {hits.map((h, i) => (
            <li key={i}>
              <button
                className="btn btn-small btn-ghost"
                data-testid="own-hit"
                onClick={() => {
                  setPin(h);
                  if (!name) setName(h.name);
                }}
              >
                {h.name}
              </button>{' '}
              <span className="small muted">{h.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">{tr.saved.ownSearchNone}</p>
      ))}
      <label className="field">
        <span>{tr.saved.ownName}</span>
        <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="own-name" />
      </label>
      <label className="field">
        <span>{tr.saved.ownNote}</span>
        <input className="text-input" value={note} onChange={(e) => setNote(e.target.value)} data-testid="own-note" />
      </label>
      <button className="btn btn-primary" disabled={!pin || !name.trim()} onClick={save} data-testid="own-save">
        {tr.saved.ownSave}
      </button>
    </section>
  );
}

export function SavedScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const [adding, setAdding] = useState<SavedPlace | null>(null);
  const [own, setOwn] = useState(false);
  const [toast, showToast] = useToast();
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const list = Object.values(us?.saved ?? {}).sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  const routeDay = (k: string) => {
    const e = Object.entries(us?.route ?? {}).find(([, r]) => r.added.some((a) => a.place.key === k));
    return e ? rec.trip.days.findIndex((d) => d.date === e[0]) + 1 : 0;
  };
  const points: MapPoint[] = list.filter((p) => p.lat !== null && p.lng !== null).map((p, i) => ({ id: p.key, lat: p.lat!, lng: p.lng!, label: String(i + 1), kind: 'place', title: p.name }));
  const pts = tripPoints(rec.trip);
  const center = pts.length ? { lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length, lng: pts.reduce((a, p) => a + p.lng, 0) / pts.length } : null;
  const setNote = (k: string, note: string) => updateUserState(tripKey, (u) => ({ ...u, saved: { ...u.saved, [k]: { ...u.saved[k], note } } }));
  const share = async () => {
    const text = await plannerText(tripKey);
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: tr.saved.shareTitle, text });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* yok say */
    }
    showToast(tr.saved.copied);
  };
  return (
    <div className="page">
      <Header title={tr.saved.title} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        {list.length === 0 && <p className="muted">{tr.saved.empty}</p>}
        {points.length > 0 && <TripMap points={points} legs={[]} height={280} showLegend={false} />}
        <ul className="plain">
          {list.map((p) => {
            const d = routeDay(p.key);
            return (
              <li key={p.key} className="card" data-testid="saved-item" data-source={p.source}>
                <h3>{p.name}</h3>
                {d > 0 && <span className="badge badge-guide">{tr.saved.inRoute(d)}</span>}
                {p.attribution && <p className="small muted">{p.attribution}</p>}
                <label className="field">
                  <span>{tr.saved.note}</span>
                  <input className="text-input" defaultValue={p.note ?? ''} onBlur={(e) => setNote(p.key, e.target.value)} data-testid="saved-note" />
                </label>
                <div className="row">
                  {d === 0 && (
                    <button className="btn btn-small btn-primary" onClick={() => setAdding(p)} data-testid="saved-add">
                      ＋ {tr.saved.addToRoute}
                    </button>
                  )}
                  {p.lat !== null && p.lng !== null && (
                    <a className="btn btn-small btn-ghost" href={googleMapsUrl({ lat: p.lat, lng: p.lng })} target="_blank" rel="noopener noreferrer">
                      {tr.discover.gmaps}
                    </a>
                  )}
                  <button
                    className="btn btn-small btn-ghost"
                    data-testid="saved-remove"
                    onClick={() =>
                      updateUserState(tripKey, (u) => {
                        const saved = { ...u.saved };
                        delete saved[p.key];
                        return { ...u, saved };
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="row">
          <button className="btn" onClick={() => setOwn((x) => !x)} data-testid="own-open">
            📍 {tr.saved.addOwn}
          </button>
          <button className="btn" onClick={share} data-testid="planner-share">
            ✉ {tr.saved.share}
          </button>
        </div>
        {own && (
          <OwnPlaceForm
            tripKey={tripKey}
            center={center}
            onSaved={(p) => {
              setOwn(false);
              setAdding(p);
            }}
          />
        )}
      </main>
      {adding && <AddToRoute trip={rec.trip} tripId={tripKey} place={adding} onClose={() => setAdding(null)} onDone={showToast} />}
      <Toast text={toast} />
    </div>
  );
}
