import { Section } from './ui.jsx'
import ComparePlayer from './ComparePlayer.jsx'
import ScalingChart from './ScalingChart.jsx'

export default function Benchmark() {
  return (
    <Section
      id="benchmark"
      eyebrow="Experiments"
      title="Six policies, one held-out task set"
      lead="Wan2.2-5B fine-tuned separately on five datasets, plus our bidirectional long-horizon model. Only the training data changes."
    >
      <div className="reveal">
        <ComparePlayer />
      </div>

      <div className="reveal mt-6">
        <ScalingChart />
      </div>
    </Section>
  )
}
