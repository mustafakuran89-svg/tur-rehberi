import { useEffect, useRef, useState } from 'react';
import type { MapController, MapLeg, MapPoint } from './types';
import type { LatLng } from '../lib/geo';
import { createSvgMap } from './svgMap';
import { addLog } from '../lib/log';
import { tr } from '../i18n/tr';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Geliştirme ve test için: localStorage'da 'tur-rehberi:svgmap' = '1' ise yedek harita kullanılır. */
function forceSvg(): boolean {
  try {
    return localStorage.getItem('tur-rehberi:svgmap') === '1';
  } catch {
    return false;
  }
}

interface Props {
  points: MapPoint[];
  legs: MapLeg[];
  user?: LatLng | null;
  pending?: LatLng | null;
  onTap?: (p: LatLng) => void;
  height?: number;
  showLegend?: boolean;
}

export function TripMap({ points, legs, user = null, pending = null, onTap, height = 300, showLegend = true }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const ctrl = useRef<MapController | null>(null);
  const tap = useRef(onTap);
  tap.current = onTap;
  const latest = useRef({ points, legs, user, pending });
  latest.current = { points, legs, user, pending };
  const [renderer, setRenderer] = useState<'loading' | 'gl' | 'svg'>('loading');
  const [basemap, setBasemap] = useState<'loading' | 'ok' | 'none'>('loading');

  useEffect(() => {
    let cancelled = false;
    let made: MapController | null = null;
    const el = box.current!;
    const onTapCb = (p: LatLng) => tap.current?.(p);
    const useSvg = () => {
      if (cancelled) return;
      made = createSvgMap(el, { onTap: onTapCb });
      ctrl.current = made;
      setRenderer('svg');
      setBasemap('none');
      const l = latest.current;
      made.update(l.points, l.legs, l.user, l.pending);
    };
    if (!webglAvailable() || forceSvg()) useSvg();
    else {
      import('./glMap')
        .then((m) => m.createGlMap(el, { onTap: onTapCb, onBasemap: (ok) => !cancelled && setBasemap(ok ? 'ok' : 'none') }))
        .then((c) => {
          if (cancelled) {
            c.destroy();
            return;
          }
          made = c;
          ctrl.current = c;
          setRenderer('gl');
          const l = latest.current;
          c.update(l.points, l.legs, l.user, l.pending);
        })
        .catch((e) => {
          addLog('info', `MapLibre açılamadı, yedek harita: ${(e as Error)?.message ?? e}`);
          el.replaceChildren();
          useSvg();
        });
    }
    return () => {
      cancelled = true;
      made?.destroy();
      ctrl.current = null;
    };
  }, []);

  useEffect(() => {
    ctrl.current?.update(points, legs, user, pending);
  }, [points, legs, user, pending, renderer]);

  return (
    <div className="map-wrap">
      <div
        ref={box}
        className="map"
        style={{ height }}
        data-testid="map"
        data-renderer={renderer}
        data-basemap={basemap}
        data-legs={legs.length}
        data-points={points.length}
      />
      {renderer !== 'loading' && basemap === 'none' && (
        <p className="map-note">
          {renderer === 'svg' ? tr.map.simpleMap + ' ' : ''}
          {tr.map.noBasemap}
        </p>
      )}
      {showLegend && (
        <ul className="map-legend" aria-hidden="true">
          <li><span className="lg lg-stop" /> {tr.map.legend.stop}</li>
          <li><span className="lg lg-breakfast" /> {tr.map.legend.breakfast}</li>
          <li><span className="lg lg-lunch" /> {tr.map.legend.lunch}</li>
          <li><span className="lg lg-dinner" /> {tr.map.legend.dinner}</li>
          <li><span className="lg lg-walk" /> {tr.map.legend.walk}</li>
          <li><span className="lg lg-drive" /> {tr.map.legend.drive}</li>
        </ul>
      )}
    </div>
  );
}
