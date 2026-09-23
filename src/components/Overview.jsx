import { mediaUrl, useMedia } from '../lib/media.jsx'
import { FigureCard, Pill, Section } from './ui.jsx'

const GAPS = [
  {
    title: 'Simulation scales, but does not look real',
    body:
      'Simulators produce trajectories cheaply, but their appearance and ' +
      'discrete actions leave a visual and dynamic gap to the physical world.',
    tone: 'cyan',
    tag: 'sim-to-real gap',
  },
  {
    title: 'Real flight looks right, but costs too much',
    body:
      'Onboard collection is realistic but slow and costly, and hard manoeuvres ' +
      'risk the aircraft. Existing datasets cover only a handful of scenes.',
    tone: 'violet',
    tag: 'cost & risk',
  },
  {
    title: 'More trajectories is not more information',
    body:
      'When scenes, objects and task configurations stay fixed, extra episodes ' +
      'are highly homogeneous and add little supervision.',
    tone: 'ours',
    tag: 'homogeneity',
  },
]


export default function Overview() {
  const { data } = useMedia()
  const fig = (k) => mediaUrl(data?.figures?.[k])

  return (
    <Section
      id="overview"
      eyebrow="The problem"
      title="Navigation data forces a three-way trade-off"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {GAPS.map((g, i) => (
          <article
            key={g.title}
            className="card card-hover reveal p-6"
            style={{ transitionDelay: `${i * 90}ms` }}
          >
            <Pill tone={g.tone}>{g.tag}</Pill>
            <h3 className="mt-4 text-[1.05rem] font-semibold leading-snug text-txt">
              {g.title}
            </h3>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-txt-dim">{g.body}</p>
          </article>
        ))}
      </div>

      <div className="reveal mt-14">
        <FigureCard
          src={fig('teaser')}
          alt="Overview of the proposed data generation pipeline"
          caption={
            <>
              <strong className="text-txt-dim">Overview of the pipeline.</strong>{' '}
              Upper left: a low-cost open-source model produces 300K common-task
              episodes with a diverse prompting strategy and motion rebalancing.
              Upper right: a stronger closed-source model produces 10K long-tail
              episodes, scaled to 100K by style diversification.
            </>
          }
        />
      </div>
    </Section>
  )
}
