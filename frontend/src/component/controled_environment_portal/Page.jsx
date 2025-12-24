import { TopBar, StatusSection, SensorGrid, ExperimentSection } from './DashboardComponents';

function Page() {
  return (
    <div className="bg-light min-vh-100 pb-5">
      
      {/* 1. The Top Navigation Bar */}
      <TopBar />

      {/* Main Content Container */}
      <div className="container-fluid mt-4" style={{ maxWidth: '100rem' }}>
        
        {/* 2. System Status & Prediction Banner */}
        <StatusSection />

        {/* 3. The Grid of 5 Sensors */}
        <SensorGrid />

        {/* 4. Bottom Section (Experiment & Analytics) */}
        <ExperimentSection />

      </div>
    </div>
  );
}

export default Page;