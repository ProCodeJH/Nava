import { getDashboardData } from '@/lib/read-logs';
import NavBar from '@/components/nav-bar';
import ConveyorLeads from '@/components/conveyor-leads';
import ConveyorLaneQuality from '@/components/conveyor-lane-quality';
import ConveyorLaneFeature from '@/components/conveyor-lane-feature';
import ConveyorLaneWatchdog from '@/components/conveyor-lane-watchdog';
import ActivityFeed from '@/components/activity-feed';
import ArsenalGrid from '@/components/arsenal-grid';
import StatsBar from '@/components/stats-bar';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const data = getDashboardData();

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(160deg, #0a0a1a 0%, #080d1a 40%, #0a1018 70%, #08080f 100%)',
      }}
    >
      <div className="mx-auto max-w-xl">
        <NavBar />
        <ConveyorLeads stats={data.stats} />
        <div className="px-3.5 space-y-1.5 mt-2.5">
          <ConveyorLaneQuality reviews={data.reviews} />
          <ConveyorLaneFeature pipelines={data.pipelines} />
          <ConveyorLaneWatchdog errors={data.errors} />
        </div>
        <div className="px-3.5 mt-1">
          <ActivityFeed activity={data.activity} />
        </div>
        <div className="px-3.5 mt-2.5">
          <ArsenalGrid />
        </div>
        <StatsBar />
      </div>
    </div>
  );
}
