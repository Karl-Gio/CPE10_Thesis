import Container from "react-bootstrap/Container";
import { MetricGrid, TrendsAndHealth } from "./DashboardComponents";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import "./DashboardComponents.css";

function DashboardPage() {
  return (
    <div className="d-flex bg-light">
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="System Dashboard" />

        <Container fluid className="dw-container">
          <div className="dw-content">
            <div className="dw-section">
              <MetricGrid />
            </div>

            <div className="dw-section">
              <TrendsAndHealth />
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

export default DashboardPage;