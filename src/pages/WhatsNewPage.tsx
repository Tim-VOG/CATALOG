import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Sparkles, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

// Curated changelog — visible to every user. Each entry is trilingual so the
// page follows the app language. Newest first. Add a new object at the top
// when something ships.
type Entry = {
  date: string
  tag: 'new' | 'improved' | 'fixed'
  title: { fr: string; en: string; nl: string }
  items: { fr: string; en: string; nl: string }[]
}

const CHANGELOG: Entry[] = [
  {
    date: '2026-07',
    tag: 'new',
    title: { fr: 'Un site entièrement multilingue', en: 'A fully multilingual app', nl: 'Een volledig meertalige app' },
    items: [
      { fr: 'Tout VO Hub est maintenant disponible en français, néerlandais et anglais — change de langue depuis ton profil.', en: 'All of VO Hub is now available in French, Dutch and English — switch language from your profile.', nl: 'Heel VO Hub is nu beschikbaar in het Frans, Nederlands en Engels — wissel van taal via je profiel.' },
      { fr: 'Un nouvel écran de bienvenue à ta première connexion pour choisir ta langue et ton thème.', en: 'A new welcome screen on your first login to pick your language and theme.', nl: 'Een nieuw welkomstscherm bij je eerste aanmelding om je taal en thema te kiezen.' },
    ],
  },
  {
    date: '2026-07',
    tag: 'improved',
    title: { fr: 'Matériel & retours plus fluides', en: 'Smoother equipment & returns', nl: 'Vlottere materiaal & retours' },
    items: [
      { fr: 'Rappels de retour automatiques : avant l’échéance et en cas de retard.', en: 'Automatic return reminders: before the due date and when overdue.', nl: 'Automatische retourherinneringen: vóór de vervaldatum en bij te laat.' },
      { fr: 'Page de confirmation claire après chaque demande envoyée.', en: 'A clear confirmation page after every request you send.', nl: 'Een duidelijke bevestigingspagina na elke verzonden aanvraag.' },
      { fr: 'Chargement du site nettement plus rapide.', en: 'Noticeably faster app loading.', nl: 'Merkbaar sneller laden van de app.' },
    ],
  },
  {
    date: '2026-06',
    tag: 'new',
    title: { fr: 'Prolongations & suivi', en: 'Extensions & tracking', nl: 'Verlengingen & tracking' },
    items: [
      { fr: 'Demande de prolongation d’un prêt directement depuis tes demandes.', en: 'Request a loan extension straight from your requests.', nl: 'Vraag een verlenging aan rechtstreeks vanuit je aanvragen.' },
      { fr: 'Suivi du matériel par QR code amélioré.', en: 'Improved QR-code equipment tracking.', nl: 'Verbeterde QR-code materiaaltracking.' },
    ],
  },
]

const TAGS: Record<Entry['tag'], { fr: string; en: string; nl: string; cls: string }> = {
  new: { fr: 'Nouveau', en: 'New', nl: 'Nieuw', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  improved: { fr: 'Amélioré', en: 'Improved', nl: 'Verbeterd', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  fixed: { fr: 'Corrigé', en: 'Fixed', nl: 'Opgelost', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
}

const SHELL = {
  title: { fr: 'Nouveautés', en: "What's new", nl: 'Nieuw' },
  subtitle: {
    fr: 'Les dernières améliorations de VO Hub.',
    en: 'The latest improvements to VO Hub.',
    nl: 'De nieuwste verbeteringen van VO Hub.',
  },
  back: { fr: "Retour à l'accueil", en: 'Back to Hub', nl: 'Terug naar Hub' },
}

function useLang() {
  const { i18n } = useTranslation()
  const l = (i18n.language || 'fr').slice(0, 2)
  return (l === 'en' || l === 'nl') ? l : 'fr'
}

export function WhatsNewPage() {
  const lang = useLang() as 'fr' | 'en' | 'nl'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">{SHELL.title[lang]}</h1>
            <p className="text-sm text-muted-foreground">{SHELL.subtitle[lang]}</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 space-y-4">
        {CHANGELOG.map((e, i) => {
          const tag = TAGS[e.tag]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.35 }}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tag.cls}`}>
                  {tag[lang]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{e.date}</span>
              </div>
              <h2 className="mt-3 text-lg font-display font-bold leading-tight">{e.title[lang]}</h2>
              <ul className="mt-2.5 space-y-1.5">
                {e.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="leading-relaxed">{it[lang]}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-8">
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" /> {SHELL.back[lang]}
          </Button>
        </Link>
      </div>
    </div>
  )
}
