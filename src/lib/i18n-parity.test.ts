import { describe, it, expect } from 'vitest'
import { adminEn, adminFr, adminNl } from './i18n-admin'
import { genEn, genFr, genNl } from './i18n-admin-generated'
import { userGenEn, userGenFr, userGenNl } from './i18n-user-generated'
import { compGenEn, compGenFr, compGenNl } from './i18n-comp-generated'

// Collect every leaf key path of a nested translation object, e.g.
// "sidebar.links.dashboard". Guards that a translator/agent didn't add,
// drop, rename or mis-nest a key in one language but not the others.
function keyPaths(obj: any, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...keyPaths(v, path))
    } else {
      out.push(path)
    }
  }
  return out.sort()
}

const NAMESPACES: Record<string, [any, any, any]> = {
  'admin (hand-written)': [adminEn, adminFr, adminNl],
  'admin (generated)': [genEn, genFr, genNl],
  'user pages (generated)': [userGenEn, userGenFr, userGenNl],
  'shared components (generated)': [compGenEn, compGenFr, compGenNl],
}

describe('i18n language parity', () => {
  for (const [name, [en, fr, nl]] of Object.entries(NAMESPACES)) {
    describe(name, () => {
      const enKeys = keyPaths(en)
      const frKeys = keyPaths(fr)
      const nlKeys = keyPaths(nl)

      it('has a non-trivial set of keys', () => {
        expect(enKeys.length).toBeGreaterThan(0)
      })

      it('FR has exactly the same keys as EN', () => {
        expect(frKeys).toEqual(enKeys)
      })

      it('NL has exactly the same keys as EN', () => {
        expect(nlKeys).toEqual(enKeys)
      })

      it('every value is a non-empty string', () => {
        for (const [lang, obj] of [['en', en], ['fr', fr], ['nl', nl]] as const) {
          for (const p of keyPaths(obj)) {
            const value = p.split('.').reduce((o: any, seg) => o?.[seg], obj)
            expect(typeof value, `${name} · ${lang} · ${p}`).toBe('string')
            expect((value as string).length, `${name} · ${lang} · ${p}`).toBeGreaterThan(0)
          }
        }
      })

      it('keeps {{placeholders}} identical across languages', () => {
        const ph = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) || []).map((x) => x.replace(/\s/g, '')).sort()
        for (const p of enKeys) {
          const get = (obj: any) => p.split('.').reduce((o: any, seg) => o?.[seg], obj) as string
          const base = ph(get(en))
          expect(ph(get(fr)), `${name} · FR · ${p}`).toEqual(base)
          expect(ph(get(nl)), `${name} · NL · ${p}`).toEqual(base)
        }
      })
    })
  }
})
