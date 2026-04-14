import { PlaybackPanel } from './PlaybackPanel';
import { VelocityChart, TimeDivergenceChart, PhaseBar, SummaryStats } from './Charts';
import { MassRatioTable } from './MassRatioTable';
import { MissionControlPanel } from './components/MissionControlPanel';
import { StarMap3D } from './components/StarMap3D';

function App() {
  return (
    <div className="w-full h-full overflow-auto p-4 flex flex-col gap-4">
      <div className="text-center text-[var(--star-gold)] text-base font-bold tracking-widest uppercase">
        Interstellar Travel Simulator
      </div>

      {/* Main layout: sidebar + 3D viewport */}
      <div className="flex gap-4 flex-col xl:flex-row" style={{ minHeight: '60vh' }}>
        {/* Mission control sidebar */}
        <div className="xl:w-80 shrink-0 xl:overflow-y-auto xl:max-h-full">
          <MissionControlPanel />
        </div>

        {/* 3D star map viewport */}
        <div className="flex-1 min-w-0 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
          <StarMap3D />
        </div>
      </div>

      {/* Summary stats + playback + charts */}
      <div className="flex flex-col gap-4">
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
