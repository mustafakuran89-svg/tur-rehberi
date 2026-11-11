// Yana kaydırılan fotoğraf galerisi (en çok altı). Her fotoğrafın altında eser sahibi ve lisans.
// Dokununca tam ekran; iki parmakla yakınlaştırılır. "Gizle" seçimi kullanıcı durumunda saklanır.
// Hiç görsel yoksa yer bırakılmaz.
import { useEffect, useRef, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Stop } from '../plan/types';
import { fetchedImages, mergeGallery, planImages, wikipediaUrl, type GalleryImage } from '../lib/gallery';
import { addLog } from '../lib/log';
import { stopKey, updateUserState, type UserState } from '../lib/userState';
import { Fullscreen, StoredImg } from './v2';

export function useGallery(stop: Stop, us: UserState | undefined, allowSearch: boolean): GalleryImage[] {
  const [fetched, setFetched] = useState<GalleryImage[]>([]);
  const plan = planImages(stop.images);
  useEffect(() => {
    let alive = true;
    if (plan.length >= 6) return;
    fetchedImages(stop, { allowSearch })
      .then((r) => alive && setFetched(r))
      .catch((e) => addLog('info', `Galeri: ${(e as Error).message}`));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop.name, stop.wikipediaTr, allowSearch, plan.length]);
  return mergeGallery(plan, fetched, us?.hiddenImages[stopKey(stop)] ?? []);
}

function Zoomable({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const start = useRef<{ d: number; s: number; x: number; y: number; px: number; py: number } | null>(null);
  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  return (
    <div
      className="zoom-box"
      onTouchStart={(e) => {
        if (e.touches.length === 2) start.current = { d: dist(e.touches), s: scale, x: pos.x, y: pos.y, px: 0, py: 0 };
        else if (e.touches.length === 1 && scale > 1) start.current = { d: 0, s: scale, x: pos.x, y: pos.y, px: e.touches[0].clientX, py: e.touches[0].clientY };
      }}
      onTouchMove={(e) => {
        const st = start.current;
        if (!st) return;
        if (e.touches.length === 2 && st.d) setScale(Math.min(5, Math.max(1, (st.s * dist(e.touches)) / st.d)));
        else if (e.touches.length === 1 && !st.d) setPos({ x: st.x + e.touches[0].clientX - st.px, y: st.y + e.touches[0].clientY - st.py });
      }}
      onTouchEnd={() => {
        start.current = null;
        if (scale <= 1.02) {
          setScale(1);
          setPos({ x: 0, y: 0 });
        }
      }}
      onDoubleClick={() => {
        setScale((s) => (s > 1 ? 1 : 2.5));
        setPos({ x: 0, y: 0 });
      }}
    >
      <StoredImg src={src} alt={alt} className="zoom-img" />
      <style>{`.zoom-box .zoom-img{transform:translate(${pos.x}px,${pos.y}px) scale(${scale})}`}</style>
    </div>
  );
}

export function Gallery({ tripId, stop, us, allowSearch }: { tripId: string; stop: Stop; us: UserState | undefined; allowSearch: boolean }) {
  const imgs = useGallery(stop, us, allowSearch);
  const [open, setOpen] = useState<number | null>(null);
  const wiki = stop.wikipediaTr ? wikipediaUrl(stop.wikipediaTr) : null;
  if (!imgs.length && !wiki) return null;
  const cur = open !== null ? imgs[open] : null;
  const hide = async (g: GalleryImage) => {
    setOpen(null);
    const k = stopKey(stop);
    await updateUserState(tripId, (u) => ({ ...u, hiddenImages: { ...u.hiddenImages, [k]: [...(u.hiddenImages[k] ?? []), g.thumb] } }));
  };
  return (
    <section className="gallery-wrap" data-testid="gallery">
      {imgs.length > 0 && (
        <>
          <h2 className="section-title">{tr.gallery.title}</h2>
          <ul className="gallery" aria-label={tr.gallery.title}>
            {imgs.map((g, i) => (
              <li key={g.thumb} className="gallery-item" data-testid="gallery-item" data-from={g.from}>
                <button className="gallery-btn" onClick={() => setOpen(i)} aria-label={tr.gallery.open(i + 1)}>
                  <StoredImg src={g.thumb} alt="" />
                </button>
                <div className="credit small muted" data-testid="credit">
                  {tr.gallery.credit(g.credit, g.license)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {wiki && (
        <a href={wiki} target="_blank" rel="noopener noreferrer" className="small" data-testid="wiki-link">
          {tr.gallery.readWiki}
        </a>
      )}
      {cur && (
        <Fullscreen onClose={() => setOpen(null)} label={tr.gallery.title} className="fs-photo">
          <Zoomable src={cur.full} alt={stop.name} />
          <div className="fs-caption">
            <span data-testid="fs-credit">{tr.gallery.credit(cur.credit, cur.license)}</span>
            {cur.sourceUrl && (
              <a href={cur.sourceUrl} target="_blank" rel="noopener noreferrer">
                ↗
              </a>
            )}
            <button className="btn btn-small btn-ghost fs-hide" onClick={() => hide(cur)} data-testid="gallery-hide">
              {tr.gallery.hide}
            </button>
          </div>
        </Fullscreen>
      )}
    </section>
  );
}
