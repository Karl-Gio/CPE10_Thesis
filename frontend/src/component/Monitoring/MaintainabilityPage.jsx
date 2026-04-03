import Container from "react-bootstrap/Container";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import MonitoringMaintainability from "./MonitoringMaintainability";

function MaintainabilityPage() {
  return (
    <div className="d-flex bg-light min-vh-100">
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Maintainability Monitoring" />

        <Container fluid style={{ maxWidth: "1400px" }}>
          <MonitoringMaintainability />
        </Container>
      </div>
    </div>
  );
}

export default MaintainabilityPage;