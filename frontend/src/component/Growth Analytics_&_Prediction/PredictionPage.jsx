import React, { useState } from "react"; // Idinagdag natin ang useState
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

// MOCK DATABASE: Dito muna tayo kukuha ng data habang wala pa yung API.
// Pwede mo itong palitan ng totoong data from backend mo later.
const mockDatabase = {
  "B-2025-001": {
    datePlanted: "2025-01-01",
    totalSeeds: 30,
    germinationCount: 26,
    deltaFromYesterday: "+2 from yesterday",
    predictedHarvest: "Jan 06, 2026",
    modelAccuracy: "95.4%",
  },
  "B-2025-002": {
    datePlanted: "2025-02-14",
    totalSeeds: 50,
    germinationCount: 42,
    deltaFromYesterday: "+5 from yesterday",
    predictedHarvest: "Mar 10, 2026",
    modelAccuracy: "91.2%",
  },
  "B-2025-003": {
    datePlanted: "2025-03-01",
    totalSeeds: 40,
    germinationCount: 15,
    deltaFromYesterday: "+15 from yesterday",
    predictedHarvest: "Apr 05, 2026",
    modelAccuracy: "88.9%",
  }
};

export default function PredictionPage() {
  // STATE: Ito ang mag-tatrack kung anong Batch ang naka-select sa dropdown
  const [selectedBatch, setSelectedBatch] = useState("B-2025-001");

  // Kukunin natin yung data mula sa mockDatabase base sa kung ano ang naka-select
  const data = mockDatabase[selectedBatch];

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Growth Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <h3 className="fw-bold mb-4">Yield Prediction Analytics</h3>

              {/* Ipinasa natin ang selectedBatch at ang function para mabago ito (setSelectedBatch) */}
              <PredictionMeta 
                batchId={selectedBatch} 
                datePlanted={data.datePlanted} 
                onBatchChange={setSelectedBatch} 
              />

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