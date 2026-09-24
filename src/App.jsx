import { MediaProvider, useMedia } from './lib/media.jsx'
import { useRevealRoot } from './lib/hooks.js'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Overview from './components/Overview.jsx'
import Pipeline from './components/Pipeline.jsx'
import Gallery from './components/Gallery.jsx'
import Analytics from './components/Analytics.jsx'
import Benchmark from './components/Benchmark.jsx'
import RealWorld from './components/RealWorld.jsx'
import Citation from './components/Citation.jsx'
import { Rule } from './components/ui.jsx'

function LoadingVeil() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-9 w-9">
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan/25" />
          <span className="absolute inset-[30%] rounded-full bg-gradient-to-br from-cyan to-violet" />
        </div>
        <span className="mono text-[0.68rem] uppercase tracking-[0.24em] text-txt-mute">
          loading dataset index
        </span>
      </div>
    </div>
  )
}

function Body() {
  const { status } = useMedia()
  useRevealRoot()

  if (status === 'loading') return <LoadingVeil />

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Overview />
        <Rule />
        <Pipeline />
        <Rule />
        <Gallery />
        <Rule />
        <Analytics />
        <Rule />
        <Benchmark />
        <Rule />
        <RealWorld />
        <Rule />
        <Citation />
      </main>
    </>
  )
}

export default function App() {
  return (
    <MediaProvider>
      <Body />
    </MediaProvider>
  )
}
