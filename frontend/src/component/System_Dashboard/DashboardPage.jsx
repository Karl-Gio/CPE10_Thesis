import Container from "react-bootstrap/Container";
import { MetricGrid, TrendsAndHealth } from "./DashboardComponents";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

function DashboardPage() {
  return (
    <div className="d-flex bg-light">
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="System Dashboard" />
        <Container fluid style={{ maxWidth: "1200px" }}>        
          <MetricGrid />
          <TrendsAndHealth />
        </Container>
      </div>
    </div>
  );
}

export default DashboardPage;