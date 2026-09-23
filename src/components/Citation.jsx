import { BIBTEX, LINKS, TITLE } from '../lib/site.js'
import { ArXivIcon, BrandLinks, HuggingFaceIcon, ModelScopeIcon } from './brand.jsx'
import { useCopy } from '../lib/hooks.js'
import { Section } from './ui.jsx'

export default function Citation() {
  const [copied, copy] = useCopy()

  const links = [
    ['Paper', LINKS.paper],
    ['Video', LINKS.video],
    ['Code', LINKS.code],
  ].filter(([, href]) => href)

  const badges = [
    { key: 'modelscope', href: LINKS.modelscope, label: 'Dataset on ModelScope', Icon: ModelScopeIcon },
    { key: 'huggingface', href: LINKS.huggingface, label: 'Dataset on Hugging Face', Icon: HuggingFaceIcon },
    { key: 'arxiv', href: LINKS.arxiv, label: 'arXiv', Icon: ArXivIcon },
  ]

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

      <div className="reveal mt-6">
        <BrandLinks className="!justify-start" links={badges} />
      </div>

      <div className="reveal mt-6 flex flex-wrap gap-3">
        {links.map(([label, href]) => (
          <a
            key={label}
            href={href}
            target={href.endsWith('.pdf') ? '_blank' : undefined}
            rel="noreferrer"
            className="btn"
          >
            {label}
          </a>
        ))}
        <span className="self-center text-[0.78rem] text-txt-mute">
          Dataset, model weights and code will be released publicly.
        </span>
      </div>
    </Section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] py-12">
      <div className="shell flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-lg">
          <div className="text-[0.86rem] font-medium leading-snug text-txt-dim">
            {TITLE}
          </div>
          <p className="mt-3 text-[0.76rem] leading-relaxed text-txt-mute">
            Zhejiang University · Differential Robotics · Southern University of
            Science and Technology
          </p>
        </div>
        <div className="text-[0.72rem] leading-relaxed text-txt-mute md:text-right">
          <div>All video shown on this page is generated or captured by the authors.</div>
          <div className="mt-1">
            Figures are reproduced from the paper; charts are redrawn for the web.
          </div>
        </div>
      </div>
    </footer>
  )
}
