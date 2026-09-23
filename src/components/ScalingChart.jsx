import { useMemo, useRef, useState } from 'react'
import { useMedia } from '../lib/media.jsx'

const W = 920
const H = 400
const PAD = { t: 18, r: 128, b: 48, l: 56 }

const X_MIN = 900
const X_MAX = 520_000
const Y_MIN = 0
const Y_MAX = 0.9

const fmtSamples = (v) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${v}`

export default function ScalingChart() {
  const { data } = useMedia()
  const series = data?.scaling?.series ?? []
  const [hidden, setHidden] = useState(() => new Set())
  const [hover, setHover] = useState(null)
  const svgRef = useRef(null)

  const x = (v) => {
    const t = (Math.log10(v) - Math.log10(X_MIN)) / (Math.log10(X_MAX) - Math.log10(X_MIN))
    return PAD.l + t * (W - PAD.l - PAD.r)
  }
  const y = (v) => H - PAD.b - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.t - PAD.b)

  const visible = series.filter((s) => !hidden.has(s.key))

  const ticks = useMemo(() => {
    const out = []
    for (const v of [1_000, 10_000, 100_000, 400_000]) out.push(v)
    return out
  }, [])

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    if (px < PAD.l - 12 || px > W - PAD.r + 12) return setHover(null)
    const t = (px - PAD.l) / (W - PAD.l - PAD.r)
    const target = Math.pow(10, Math.log10(X_MIN) + t * (Math.log10(X_MAX) - Math.log10(X_MIN)))

    // nearest sample point across every visible series
    let best = null
    visible.forEach((s) => {
      s.samples.forEach((smp, i) => {
        const d = Math.abs(Math.log10(smp) - Math.log10(target))
        if (!best || d < best.d) best = { d, s, i, smp }
      })
    })
    setHover(best)
  }

  const toggle = (key) =>
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  if (!series.length) {
    return <div className="card h-72 animate-pulse bg-white/[0.02]" />
  }

  return (
    <div className="card p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="mono text-[0.66rem] uppercase tracking-[0.18em] text-cyan">
            Scaling behaviour
          </div>
          <h3 className="mt-2 text-[1.15rem] font-semibold text-txt">
            Navigation progress score vs. dataset size
          </h3>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-semibold text-ours">79%</div>
          <div className="text-[0.7rem] text-txt-mute">
            bidirectional, ≈1 epoch
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* grid ---------------------------------------------------------- */}
        {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 12}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-[#6d7889]"
              style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
            >
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={x(v)}
              x2={x(v)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 5"
            />
            <text
              x={x(v)}
              y={H - PAD.b + 22}
              textAnchor="middle"
              className="fill-[#6d7889]"
              style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
            >
              {fmtSamples(v)}
            </text>
          </g>
        ))}

        <text
          x={PAD.l + (W - PAD.l - PAD.r) / 2}
          y={H - 8}
          textAnchor="middle"
          className="fill-[#8b96ad]"
          style={{ fontSize: 12.5 }}
        >
          Number of training samples
        </text>

        {/* series -------------------------------------------------------- */}
        {visible.map((s) => {
          const d = s.samples
            .map((smp, i) => `${i ? 'L' : 'M'}${x(smp).toFixed(1)},${y(s.progress[i]).toFixed(1)}`)
            .join(' ')
          const dim = hover && hover.s.key !== s.key
          return (
            <g key={s.key} opacity={dim ? 0.28 : 1} style={{ transition: 'opacity 0.2s' }}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.highlight ? 2.8 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.samples.map((smp, i) => (
                <circle
                  key={i}
                  cx={x(smp)}
                  cy={y(s.progress[i])}
                  r={s.highlight ? 4.2 : 3.4}
                  fill={s.color}
                  stroke="#04060c"
                  strokeWidth="1.4"
                />
              ))}
              <circle
                cx={x(s.samples[s.oneEpochIndex])}
                cy={y(s.progress[s.oneEpochIndex])}
                r={9}
                fill="none"
                stroke={s.color}
                strokeWidth="1.8"
              />
            </g>
          )
        })}

        {/* hover crosshair ---------------------------------------------- */}
        {hover && (
          <g>
            <line
              x1={x(hover.smp)}
              x2={x(hover.smp)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="rgba(34,211,238,0.4)"
              strokeDasharray="4 4"
            />
            <circle
              cx={x(hover.smp)}
              cy={y(hover.s.progress[hover.i])}
              r={6.5}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
            />
          </g>
        )}

        {/* legend -------------------------------------------------------- */}
        <g transform={`translate(${W - PAD.r + 16}, ${PAD.t + 6})`}>
          {series.map((s, i) => {
            const off = hidden.has(s.key)
            return (
              <g
                key={s.key}
                transform={`translate(0, ${i * 26})`}
                onClick={() => toggle(s.key)}
                style={{ cursor: 'pointer' }}
                opacity={off ? 0.35 : 1}
              >
                <rect x="-4" y="-11" width="132" height="22" fill="transparent" />
                <line x1="0" x2="18" y1="0" y2="0" stroke={s.color} strokeWidth="2.4" />
                <circle cx="9" cy="0" r="3.6" fill={s.color} />
                <text
                  x="26"
                  y="0"
                  dominantBaseline="central"
                  className="fill-[#a4afc4]"
                  style={{ fontSize: 11.5 }}
                >
                  {s.label}
                </text>
              </g>
            )
          })}
          <g transform={`translate(0, ${series.length * 26 + 6})`}>
            <circle
              cx="9"
              cy="0"
              r="8"
              fill="none"
              stroke="#8b96ad"
              strokeWidth="1.6"
            />
            <text
              x="26"
              y="0"
              dominantBaseline="central"
              className="fill-[#6d7889]"
              style={{ fontSize: 11.5 }}
            >
              ≈ 1 epoch
            </text>
          </g>
        </g>
      </svg>

      {/* readout --------------------------------------------------------- */}
      <div className="mt-3 flex min-h-[46px] flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        {hover ? (
          <>
            <span className="mono text-[0.74rem] text-cyan">
              {fmtSamples(hover.smp)} samples
            </span>
            {visible.map((s) => {
              const i = s.samples.reduce(
                (best, smp, k) =>
                  Math.abs(Math.log10(smp) - Math.log10(hover.smp)) <
                  Math.abs(Math.log10(s.samples[best]) - Math.log10(hover.smp))
                    ? k
                    : best,
                0,
              )
              return (
                <span key={s.key} className="flex items-center gap-2 text-[0.74rem]">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-txt-mute">{s.label}</span>
                  <span className="mono text-txt">{Math.round(s.progress[i] * 100)}%</span>
                </span>
              )
            })}
          </>
        ) : (
          <span className="text-[0.76rem] text-txt-mute">
            Hover the chart to read every dataset at a given dataset size. Click a
            legend entry to isolate a curve.
          </span>
        )}
      </div>

    </div>
  )
}
