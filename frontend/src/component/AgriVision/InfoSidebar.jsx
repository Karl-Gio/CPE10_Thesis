import SystemTimeCard from "./Card/SystemTimeCard";
import SeedStatusCard from "./Card/SeedStatusCard";
import AccuracyMetricsCard from "./Card/AccuracyMetricsCard";

export default function InfoSidebar({ data }) {
  return (
    <div className="d-flex flex-column gap-3">
      <SystemTimeCard />
      <SeedStatusCard seedStatus={data.seedStatus} confidence={data.confidence} />
      <AccuracyMetricsCard
        germinatedAccuracy={data.germinatedAccuracy}
        detectionRate={data.detectionRate}
        seedsPlanted={data.seedsPlanted}
        germinatedCount={data.germinatedCount}
        confidence={data.confidence}
      />
    </div>
  );
}