import type { LatLng } from '../lib/geo';
import type { LegMode } from '../plan/types';

export type PointKind = 'stop' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'event' | 'lodging' | 'hub' | 'step' | 'place';

export interface MapPoint extends LatLng {
  id: string;
  label: string; // "1", "K2", "A1"
  kind: PointKind;
  title: string;
  href?: string;
  done?: boolean; // tur modunda tetiklenmiş/geçilmiş
  active?: boolean; // tur modunda sıradaki
  michelin?: boolean; // Michelin rehberindeki mekan: ayırt edici halka
  faded?: boolean; // saati geçmiş etkinlik
  added?: boolean; // kişisel rotaya kullanıcının eklediği yer
}

export interface MapLeg {
  id: string;
  from: LatLng;
  to: LatLng;
  mode: LegMode;
  text?: string;
}

export interface MapController {
  update(points: MapPoint[], legs: MapLeg[], user: LatLng | null, pending: LatLng | null): void;
  destroy(): void;
}

export function markerElement(p: MapPoint, onClick?: () => void): HTMLElement {
  const el = document.createElement('div');
  el.className = `mk mk-${p.kind}${p.done ? ' mk-done' : ''}${p.active ? ' mk-active' : ''}${p.michelin ? ' mk-michelin' : ''}${p.faded ? ' mk-faded' : ''}${p.added ? ' mk-added' : ''}`;
  el.dataset.label = p.label;
  el.dataset.kind = p.kind;
  el.title = p.title;
  el.setAttribute('role', p.href ? 'link' : 'img');
  el.setAttribute('aria-label', p.title);
  el.textContent = p.label;
  if (onClick || p.href) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onClick) onClick();
      else if (p.href) window.location.hash = p.href.replace(/^#/, '');
    });
  }
  return el;
}

export function legLabelElement(text: string, mode: LegMode): HTMLElement {
  const el = document.createElement('div');
  el.className = `leg-label leg-${mode}`;
  el.textContent = text;
  return el;
}

export function userElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mk-user';
  el.dataset.testid = 'user-dot';
  return el;
}

export function pendingElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mk-pending';
  return el;
}
