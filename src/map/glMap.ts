// MapLibre GL JS ile harita. Bu modül ayrı yüklenir (ilk açılışı hafifletir).
import { Map as MlMap, Marker, LngLatBounds, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { BASEMAP_STYLE_URL, BASEMAP_TIMEOUT_MS } from './config';
import { legLabelElement, markerElement, pendingElement, userElement, type MapController, type MapLeg, type MapPoint } from './types';
import type { LatLng } from '../lib/geo';

setWorkerUrl(workerUrl);

const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'zemin', type: 'background', paint: { 'background-color': '#ece6d8' } }],
};

async function loadStyle(): Promise<{ style: StyleSpecification | string; ok: boolean }> {
  if (!navigator.onLine) return { style: BLANK_STYLE, ok: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BASEMAP_TIMEOUT_MS);
  try {
    const res = await fetch(BASEMAP_STYLE_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return { style: (await res.json()) as StyleSpecification, ok: true };
  } catch {
    return { style: BLANK_STYLE, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function createGlMap(
  container: HTMLElement,
  opts: { onTap: (p: LatLng) => void; onBasemap: (ok: boolean) => void },
): Promise<MapController> {
  const { style, ok } = await loadStyle();
  opts.onBasemap(ok);
  const map = new MlMap({
    container,
    style,
    center: [0, 0],
    zoom: 1,
    attributionControl: { compact: false },
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();

  // Karoların gelmesi beklenmez: stil çözülünce rota ve işaretler çizilir. Karolar gelmezse
  // (çevrimdışı, servis kapalı) zemin boş kalır ama duraklar görünür.
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      map.remove();
      reject(new Error('harita stili zamanında yüklenemedi'));
    }, 10000);
    if (map.isStyleLoaded()) {
      clearTimeout(t);
      resolve();
      return;
    }
    map.once('style.load', () => {
      clearTimeout(t);
      resolve();
    });
    map.once('error', (e) => {
      // Altlık karolarının hatası haritayı durdurmaz; yalnız stil hatası önemlidir.
      if (!map.isStyleLoaded()) {
        clearTimeout(t);
        reject(e.error ?? new Error('harita hatası'));
      }
    });
  });

  map.addSource('legs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'legs-casing', type: 'line', source: 'legs', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.85 } });
  map.addLayer({
    id: 'legs-walk',
    type: 'line',
    source: 'legs',
    filter: ['==', ['get', 'mode'], 'walk'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#1f4d45', 'line-width': 4, 'line-dasharray': [0.2, 2] },
  });
  map.addLayer({
    id: 'legs-drive',
    type: 'line',
    source: 'legs',
    filter: ['!=', ['get', 'mode'], 'walk'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#7a4b2a', 'line-width': 5 },
  });

  map.on('click', (e) => opts.onTap({ lat: e.lngLat.lat, lng: e.lngLat.lng }));

  let markers: Marker[] = [];
  let userMarker: Marker | null = null;
  let pendingMarker: Marker | null = null;
  let fitKey = '';

  return {
    update(points: MapPoint[], legs: MapLeg[], user: LatLng | null, pending: LatLng | null) {
      markers.forEach((m) => m.remove());
      markers = [];
      for (const p of points) markers.push(new Marker({ element: markerElement(p) }).setLngLat([p.lng, p.lat]).addTo(map));
      for (const l of legs) {
        if (!l.text) continue;
        const mid: [number, number] = [(l.from.lng + l.to.lng) / 2, (l.from.lat + l.to.lat) / 2];
        markers.push(new Marker({ element: legLabelElement(l.text, l.mode) }).setLngLat(mid).addTo(map));
      }
      const src = map.getSource('legs') as unknown as { setData: (d: unknown) => void } | undefined;
      src?.setData({
        type: 'FeatureCollection',
        features: legs.map((l) => ({
          type: 'Feature',
          properties: { mode: l.mode, id: l.id },
          geometry: { type: 'LineString', coordinates: [[l.from.lng, l.from.lat], [l.to.lng, l.to.lat]] },
        })),
      });
      if (user) {
        if (!userMarker) userMarker = new Marker({ element: userElement() });
        userMarker.setLngLat([user.lng, user.lat]).addTo(map);
      } else userMarker?.remove();
      if (pending) {
        if (!pendingMarker) pendingMarker = new Marker({ element: pendingElement() });
        pendingMarker.setLngLat([pending.lng, pending.lat]).addTo(map);
      } else pendingMarker?.remove();

      const key = points.map((p) => p.id + p.lat + p.lng).join('|');
      if (key !== fitKey && points.length) {
        fitKey = key;
        const b = new LngLatBounds();
        points.forEach((p) => b.extend([p.lng, p.lat]));
        if (user) b.extend([user.lng, user.lat]);
        map.fitBounds(b, { padding: 48, maxZoom: 16, duration: 0 });
      }
    },
    destroy() {
      map.remove();
    },
  };
}
