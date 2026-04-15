import { PlaybackPanel } from './PlaybackPanel';
import { VelocityChart, TimeDivergenceChart, PhaseBar, SummaryStats } from './Charts';
import { MassRatioTable } from './MassRatioTable';
import { MissionControlPanel } from './components/MissionControlPanel';
import { StarMap3D } from './components/StarMap3D';

function App() {
  return (
    <div className="w-full min-h-full overflow-auto flex flex-col">
      {/* Desktop-only title */}
      <div className="hidden xl:block text-center text-[var(--star-gold)] text-base font-bold tracking-widest uppercase p-4 pb-0">
        Interstellar Travel Simulator
      </div>

      {/* Main layout: sidebar + 3D viewport */}
      <div className="flex flex-col xl:flex-row xl:gap-4 xl:p-4 xl:pt-4">
        {/* 3D star map viewport — hero on mobile (edge-to-edge, full screen height) */}
        <div className="order-1 xl:order-2 flex-1 min-w-0 xl:rounded-lg overflow-hidden">
          <StarMap3D />
        </div>

        {/* Mission control sidebar — below map on mobile, left column on desktop */}
        <div className="order-2 xl:order-1 xl:w-80 shrink-0 xl:h-full xl:overflow-y-auto px-4 pt-4 xl:px-0 xl:pt-0">
          <MissionControlPanel />
        </div>
      </div>

      {/* Summary stats + playback + charts */}
      <div className="flex flex-col gap-4 p-4">
        <SummaryStats />

        <div className="flex gap-4 flex-col lg:flex-row">
          {/* Left column — playback + phase */}
          <div className="flex flex-col gap-4 lg:w-72 shrink-0">
            <PlaybackPanel />
            <PhaseBar />
          </div>

          {/* Right column — charts + mass ratio */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <VelocityChart />
            <TimeDivergenceChart />
            <MassRatioTable />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
