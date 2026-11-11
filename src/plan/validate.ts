import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import schema from '../../plan.schema.json';
import type { Trip } from './types';
import { tr } from '../i18n/tr';

// Kökteki plan.schema.json tek şema kaynağıdır; burada yalnızca derlenir.
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateFn = ajv.compile(schema as object);

export interface SchemaProblem {
  path: string; // okunur alan yolu: "2. gün › 3. durak › lat"
  message: string; // Türkçe neden
}

export type ValidationResult =
  | { ok: true; trip: Trip }
  | { ok: false; problems: SchemaProblem[] };

/** JSON işaretçisini ("/days/1/stops/2/lat") okunur Türkçe yola çevirir. */
export function readablePath(pointer: string): string {
  if (!pointer) return tr.validation.root;
  const parts = pointer.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    const label = tr.validation.fields[p as keyof typeof tr.validation.fields];
    if (next !== undefined && /^\d+$/.test(next)) {
      const n = Number(next) + 1;
      out.push(tr.validation.indexed(label ?? p, n));
      i++;
    } else if (/^\d+$/.test(p)) {
      out.push(tr.validation.indexed(tr.validation.item, Number(p) + 1));
    } else {
      out.push(label ? `${label} (${p})` : p);
    }
  }
  return out.join(' › ');
}

function messageFor(e: ErrorObject): string {
  const m = tr.validation.msg;
  const params = e.params as Record<string, unknown>;
  switch (e.keyword) {
    case 'required':
      return m.required(String(params.missingProperty));
    case 'additionalProperties':
      return m.additional(String(params.additionalProperty));
    case 'type':
      return m.type(String(params.type));
    case 'enum':
      return m.enum((params.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(', '));
    case 'const':
      return m.const(JSON.stringify(params.allowedValue));
    case 'pattern':
      if (e.instancePath.endsWith('/url')) return m.url;
      if (/Date$|date$|verifiedAt$/.test(e.instancePath)) return m.date;
      if (e.instancePath === '/id') return m.id;
      if (e.instancePath.endsWith('/code')) return m.code;
      return m.pattern;
    case 'minLength':
      return m.empty;
    case 'minItems':
      return m.minItems(Number(params.limit));
    case 'minimum':
      return m.minimum(Number(params.limit));
    case 'oneOf':
      return m.oneOf;
    default:
      return e.message ?? m.unknown;
  }
}

/** Şema doğrulaması. Hata varsa hangi alanın neden geçmediğini Türkçe döndürür. */
export function validatePlan(data: unknown): ValidationResult {
  if (validateFn(data)) return { ok: true, trip: data as Trip };
  const errs = (validateFn.errors ?? []).filter((e) => {
    // oneOf alt dallarının gürültüsünü azalt: null dalının "type" hatası anlamsızdır
    if (e.keyword === 'type' && e.params && (e.params as { type?: string }).type === 'null') return false;
    return true;
  });
  const seen = new Set<string>();
  const problems: SchemaProblem[] = [];
  for (const e of errs) {
    const p = { path: readablePath(e.instancePath), message: messageFor(e) };
    const k = p.path + '|' + p.message;
    if (seen.has(k)) continue;
    seen.add(k);
    problems.push(p);
  }
  if (problems.length === 0) problems.push({ path: tr.validation.root, message: tr.validation.msg.unknown });
  return { ok: false, problems };
}

/** Metni JSON olarak çözer; hata Türkçe döner. */
export function parsePlanText(text: string): { ok: true; data: unknown } | { ok: false; message: string } {
  const trimmed = text.replace(/^﻿/, '').trim();
  if (!trimmed) return { ok: false, message: tr.importer.emptyText };
  try {
    return { ok: true, data: JSON.parse(trimmed) };
  } catch (e) {
    return { ok: false, message: tr.importer.notJson((e as Error).message) };
  }
}
