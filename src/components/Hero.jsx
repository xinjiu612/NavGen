import { Fragment } from 'react'
import { AFFILIATIONS, AUTHORS, HEADLINE_STATS, LINKS, TITLE } from '../lib/site.js'
import { mediaUrl, useMedia } from '../lib/media.jsx'
import { Stat } from './ui.jsx'
import { ArXivIcon, BrandLinks, GitHubIcon, HuggingFaceIcon, ModelScopeIcon } from './brand.jsx'

/* A slowly breathing mosaic of dataset stills, tilted away from the viewer. */
function DataWall({ frames }) {
  if (!frames.length) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: '1400px' }}
    >
      <div
        className="absolute -inset-x-[12%] -top-[16%] grid h-[132%] grid-cols-4 gap-2 opacity-[0.42] md:grid-cols-6 md:gap-2.5"
        style={{
          transform: 'rotateX(17deg) scale(1.14)',
          transformOrigin: '50% 12%',
          maskImage:
            'radial-gradient(120% 78% at 50% 34%, #000 6%, rgba(0,0,0,0.55) 48%, transparent 82%)',
          WebkitMaskImage:
            'radial-gradient(120% 78% at 50% 34%, #000 6%, rgba(0,0,0,0.55) 48%, transparent 82%)',
        }}
      >
        {frames.map((f, i) => (
          <div
            key={f}
            className="overflow-hidden rounded-lg border border-white/[0.06]"
            style={{
              animation: `drift ${16 + (i % 7) * 2.5}s ease-in-out ${-(i * 1.37) % 12}s infinite`,
              opacity: 0,
            }}
          >
            <img
              src={mediaUrl(f)}
              alt=""
              loading={i < 6 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* colour wash + vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/55 via-ink-950/72 to-ink-950" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_18%_18%,rgba(34,211,238,0.16),transparent_70%),radial-gradient(52%_46%_at_84%_26%,rgba(139,92,246,0.18),transparent_72%)]" />
      <div className="absolute inset-0 grid-veil opacity-[0.5]" />
    </div>
  )
}

function AffMark({ ids, corresponding }) {
  return (
    <span className="ml-0.5 align-super text-[0.62rem] text-txt-mute">
      {ids.join(',')}
      {corresponding && <span className="text-cyan">†</span>}
    </span>
  )
}

export default function Hero() {
  const { data } = useMedia()
  const frames = data?.hero ?? []

  return (
    <section id="top" className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden pb-14 pt-28">
      <DataWall frames={frames} />

      <div className="shell relative">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-[1.9rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem] md:text-[3.25rem]">
            <span className="grad-text">NavGen</span>
            <span className="text-txt">: Visual Generative Models</span>
            <br />
            <span className="text-txt">as a </span>
            <span className="grad-text">Scalable Data Engine</span>
            <br />
            <span className="text-txt">for Embodied 3D Navigation</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-[0.98rem] leading-relaxed text-txt-dim md:text-[1.06rem]">
            400K navigation episodes synthesised by visual generative models —
            diverse, realistic, and good enough to fly a real UAV zero-shot.
          </p>

          {/* One row of outward-facing resources. Section links live in the
              nav, so the hero does not repeat them. */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
            <a href="paper.pdf" target="_blank" rel="noreferrer" className="btn btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 2h8l6 6v14H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              Read the paper
            </a>
            <BrandLinks
              links={[
                { key: 'modelscope', href: LINKS.modelscope, label: 'ModelScope', Icon: ModelScopeIcon },
                { key: 'huggingface', href: LINKS.huggingface, label: 'Hugging Face', Icon: HuggingFaceIcon },
                { key: 'code', href: LINKS.code, label: 'GitHub', Icon: GitHubIcon },
                { key: 'arxiv', href: LINKS.arxiv, label: 'arXiv', Icon: ArXivIcon },
              ]}
            />
          </div>
          <div className="mt-12">
            <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1 text-[0.92rem] text-txt">
              {AUTHORS.map((a, i) => (
                <Fragment key={a.name}>
                  <span className="whitespace-nowrap">
                    <span className={a.corresponding ? 'font-medium' : ''}>{a.name}</span>
                    <AffMark ids={a.aff} corresponding={a.corresponding} />
                    {i < AUTHORS.length - 1 && <span className="text-txt-mute">,</span>}
                  </span>
                  {/* The paper breaks the list here, leaving the last three on
                      their own line. */}
                  {a.name === 'Zhiyang Liu' && (
                    <span aria-hidden="true" className="basis-full" />
                  )}
                </Fragment>
              ))}
            </div>
            <div className="mx-auto mt-4 max-w-3xl space-y-1 text-[0.76rem] leading-relaxed text-txt-mute">
              {AFFILIATIONS.map((a) => (
                <div key={a.id}>
                  <span className="mono text-txt-dim">{a.id}</span> {a.text}
                </div>
              ))}
              <div className="pt-1">
                <span className="text-cyan">†</span>{' '}
                {(() => {
                  const who = AUTHORS.filter((a) => a.corresponding)
                  return `Corresponding author${who.length > 1 ? 's' : ''}: ${who
                    .map((a) => a.name)
                    .join(', ')}`
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="reveal mt-14 md:mt-20">
          <div className="card grid grid-cols-2 gap-x-4 gap-y-8 px-6 py-8 md:grid-cols-5 md:gap-x-6 md:px-10">
            {HEADLINE_STATS.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
