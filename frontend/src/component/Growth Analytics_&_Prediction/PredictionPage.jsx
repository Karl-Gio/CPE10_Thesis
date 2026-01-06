import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import {
  PredictionMeta,
  PredictionStatCard,
  PredictionBottomBar,
} from "./PredictionComponents";

export default function PredictionPage() {
  // mock values (replace later with API)
  const data = {
    batchId: "B-2025-001",
    datePlanted: "2025-01-01",
    totalSeeds: 30,
    germinationCount: 26,
    deltaFromYesterday: "+2 from yesterday",
    predictedHarvest: "Jan 06, 2026",
    modelAccuracy: "95.4%",
  };

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Growth Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <h3 className="fw-bold mb-4">Yield Prediction Analytics</h3>

              <PredictionMeta batchId={data.batchId} datePlanted={data.datePlanted} />

              <Row className="g-4 mb-4">
                <Col md={6}>
                  <PredictionStatCard title="Total Seeds Planted" value={data.totalSeeds} />
                </Col>
                <Col md={6}>
                  <PredictionStatCard
                    title="Germination Count"
                    value={data.germinationCount}
                    subText={data.deltaFromYesterday}
                  />
                </Col>
              </Row>

              <Row className="g-4">
                <Col md={6}>
                  <PredictionBottomBar
                    leftLabel="Predicted Harvest"
                    rightValue={data.predictedHarvest}
                    variant="dark"
                  />
                </Col>
                <Col md={6}>
                  <PredictionBottomBar
                    leftLabel="Model Accuracy"
                    rightValue={data.modelAccuracy}
                    variant="green"
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}
