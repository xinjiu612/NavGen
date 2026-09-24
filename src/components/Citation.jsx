import { BIBTEX } from '../lib/site.js'
import { useCopy } from '../lib/hooks.js'
import { Section } from './ui.jsx'

export default function Citation() {
  const [copied, copy] = useCopy()

  return (
    <Section
      id="cite"
      eyebrow="Citation"
      title="If this work is useful, please cite it"
    >
      <div className="reveal card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3.5">
          <span className="mono text-[0.7rem] uppercase tracking-[0.18em] text-txt-mute">
            BibTeX
          </span>
          <button
            onClick={() => copy(BIBTEX)}
            className={`btn !px-3.5 !py-1.5 !text-[0.78rem] ${
              copied ? '!border-cyan/50 !text-cyan' : ''
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto px-5 py-5 text-[0.78rem] leading-relaxed text-txt-dim">
          <code className="mono whitespace-pre">{BIBTEX}</code>
        </pre>
      </div>
    </Section>
  )
}

