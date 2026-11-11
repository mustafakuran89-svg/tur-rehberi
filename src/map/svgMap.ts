// Yedek harita: WebGL yoksa ya da MapLibre açılamazsa duraklar ve rota boş zemin üzerinde
// SVG ile çizilir. Altlık yoktur; işaretler ve etaplar aynı görünür, dokunma konumu verir.
import { legLabelElement, markerElement, pendingElement, userElement, type MapController, type MapLeg, type MapPoint } from './types';
import type { LatLng } from '../lib/geo';

const NS = 'http://www.w3.org/2000/svg';
const PAD = 36;

export function createSvgMap(container: HTMLElement, opts: { onTap: (p: LatLng) => void }): MapController {
  container.classList.add('svgmap');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'svgmap-svg');
  const overlay = document.createElement('div');
  overlay.className = 'svgmap-overlay';
  container.append(svg, overlay);

  let last: { points: MapPoint[]; legs: MapLeg[]; user: LatLng | null; pending: LatLng | null } = { points: [], legs: [], user: null, pending: null };
  let proj: { x: (p: LatLng) => number; y: (p: LatLng) => number; inv: (x: number, y: number) => LatLng } | null = null;

  function makeProj(all: LatLng[], w: number, h: number) {
    const lat0 = all.length ? all.reduce((s, p) => s + p.lat, 0) / all.length : 0;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = all.map((p) => p.lng * k);
    const ys = all.map((p) => p.lat);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    if (!all.length) { minX = -1; maxX = 1; minY = -1; maxY = 1; }
    const span = Math.max(maxX - minX, maxY - minY, 0.002);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const s = Math.min(w - 2 * PAD, h - 2 * PAD) / span;
    return {
      x: (p: LatLng) => w / 2 + (p.lng * k - cx) * s,
      y: (p: LatLng) => h / 2 - (p.lat - cy) * s,
      inv: (x: number, y: number) => ({ lng: ((x - w / 2) / s + cx) / k, lat: cy - (y - h / 2) / s }),
    };
  }

  function render() {
    const w = container.clientWidth || 360;
    const h = container.clientHeight || 280;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const { points, legs, user, pending } = last;
    const all: LatLng[] = [...points];
    if (user) all.push(user);
    if (pending) all.push(pending);
    proj = makeProj(all, w, h);
    const P = proj;
    svg.replaceChildren();
    overlay.replaceChildren();
    for (const l of legs) {
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', String(P.x(l.from)));
      line.setAttribute('y1', String(P.y(l.from)));
      line.setAttribute('x2', String(P.x(l.to)));
      line.setAttribute('y2', String(P.y(l.to)));
      line.setAttribute('class', `svgleg svgleg-${l.mode === 'walk' ? 'walk' : 'drive'}`);
      svg.appendChild(line);
      if (l.text) {
        const el = legLabelElement(l.text, l.mode);
        el.style.left = `${(P.x(l.from) + P.x(l.to)) / 2}px`;
        el.style.top = `${(P.y(l.from) + P.y(l.to)) / 2}px`;
        overlay.appendChild(el);
      }
    }
    const place = (el: HTMLElement, p: LatLng) => {
      el.style.left = `${P.x(p)}px`;
      el.style.top = `${P.y(p)}px`;
      overlay.appendChild(el);
    };
    points.forEach((p) => place(markerElement(p), p));
    if (user) place(userElement(), user);
    if (pending) place(pendingElement(), pending);
  }

  const onClick = (e: MouseEvent) => {
    if (!proj) return;
    const r = container.getBoundingClientRect();
    opts.onTap(proj.inv(e.clientX - r.left, e.clientY - r.top));
  };
  container.addEventListener('click', onClick);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => render()) : null;
  ro?.observe(container);

  return {
    update(points, legs, user, pending) {
      last = { points, legs, user, pending };
      render();
    },
    destroy() {
      ro?.disconnect();
      container.removeEventListener('click', onClick);
      svg.remove();
      overlay.remove();
      container.classList.remove('svgmap');
    },
  };
}
