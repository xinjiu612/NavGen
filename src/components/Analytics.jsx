import { DIVERSITY_BARS } from '../lib/site.js'
import { Section } from './ui.jsx'
import { useInView } from '../lib/hooks.js'

function VendiChart() {
  const [ref, inView] = useInView({ threshold: 0.3 })
  const max = Math.max(...DIVERSITY_BARS.map((d) => d.vendi))
  const ours = DIVERSITY_BARS.find((d) => d.ours)

  return (
    <div ref={ref} className="card p-6 md:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="mono text-[0.66rem] uppercase tracking-[0.18em] text-cyan">
            Vendi Score ↑
          </div>
          <h3 className="mt-2 text-[1.05rem] font-semibold text-txt">
            Semantic diversity
          </h3>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-semibold text-ours">2.8×</div>
          <div className="text-[0.7rem] text-txt-mute">vs best baseline</div>
        </div>
      </div>

      <p className="mt-3 text-[0.82rem] leading-relaxed text-txt-mute">
        Effective number of semantically distinct modes, from the matrix
        exponential entropy of the CLIP feature similarity matrix.
      </p>

      <ul className="mt-6 space-y-3.5">
        {DIVERSITY_BARS.map((d, i) => (
          <li key={d.name}>
            <div className="mb-1.5 flex items-baseline justify-between text-[0.8rem]">
              <span className={d.ours ? 'font-semibold text-txt' : 'text-txt-dim'}>
                {d.name}
                {d.real && (
                  <span className="ml-2 text-[0.66rem] text-txt-mute">
                    real flight
                  </span>
                )}
              </span>
              <span className={`mono ${d.ours ? 'text-ours' : 'text-txt-mute'}`}>
                {d.vendi.toFixed(1)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: inView ? `${(d.vendi / max) * 100}%` : '0%',
                  background: d.ours
                    ? 'linear-gradient(90deg,#f0453f,#ff8a7a)'
                    : 'linear-gradient(90deg,rgba(79,143,247,0.85),rgba(139,92,246,0.85))',
                  transition: 'width 1.1s cubic-bezier(0.3,0.8,0.3,1)',
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-white/[0.07] pt-4 text-[0.8rem] leading-relaxed text-txt-dim">
        {ours.vendi.toFixed(1)} against {Math.max(...DIVERSITY_BARS.filter((d) => !d.ours).map((d) => d.vendi)).toFixed(1)} for the
        next best competitor — richer coverage of scene types, lighting and
        viewpoints, not just more clips.
      </p>
    </div>
  )
}

function FdChart() {
  const [ref, inView] = useInView({ threshold: 0.3 })
  const max = Math.max(...DIVERSITY_BARS.map((d) => d.fd))
  // Sorted ascending: lower Fréchet distance to real images is better.
  const rows = [...DIVERSITY_BARS].sort((a, b) => a.fd - b.fd)

  return (
    <div ref={ref} className="card p-6 md:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="mono text-[0.66rem] uppercase tracking-[0.18em] text-violet">
            FD-CLIP ↓
          </div>
          <h3 className="mt-2 text-[1.05rem] font-semibold text-txt">
            Sim-to-real alignment
          </h3>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-semibold text-txt">0.806</div>
          <div className="text-[0.7rem] text-txt-mute">best non-real dataset</div>
        </div>
      </div>

      <p className="mt-3 text-[0.82rem] leading-relaxed text-txt-mute">
        Fréchet distance over CLIP features between each dataset and 1000 held-out
        real deployment images. UAV-Flow is genuine flight footage, so it is the
        floor rather than a competitor.
      </p>

      <ul className="mt-6 space-y-3.5">
        {rows.map((d, i) => (
          <li key={d.name}>
            <div className="mb-1.5 flex items-baseline justify-between text-[0.8rem]">
              <span className={d.ours ? 'font-semibold text-txt' : 'text-txt-dim'}>
                {d.name}
                {d.real && (
                  <span className="ml-2 text-[0.66rem] text-txt-mute">
                    real flight · floor
                  </span>
                )}
              </span>
              <span className={`mono ${d.ours ? 'text-ours' : 'text-txt-mute'}`}>
                {d.fd.toFixed(3)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: inView ? `${(d.fd / max) * 100}%` : '0%',
                  background: d.ours
                    ? 'linear-gradient(90deg,#f0453f,#ff8a7a)'
                    : d.real
                      ? 'linear-gradient(90deg,rgba(63,191,111,0.85),rgba(63,191,111,0.4))'
                      : 'linear-gradient(90deg,rgba(240,168,120,0.8),rgba(224,85,159,0.6))',
                  transition: 'width 1.1s cubic-bezier(0.3,0.8,0.3,1)',
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-white/[0.07] pt-4 text-[0.8rem] leading-relaxed text-txt-dim">
        In the CLIP feature space, real-world samples fall inside our dataset's
        distribution while competing datasets occupy largely disjoint regions —
        the qualitative counterpart to the distance above.
      </p>
    </div>
  )
}

export default function Analytics() {
  return (
    <Section
      id="analysis"
      eyebrow="Dataset analysis"
      title="What the engine actually produced"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="reveal">
          <VendiChart />
        </div>
        <div className="reveal" style={{ transitionDelay: '90ms' }}>
          <FdChart />
        </div>
      </div>

    </Section>
  )
}
