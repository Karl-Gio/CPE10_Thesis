import React, { useState } from "react";
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

const mockDatabase = {
  "B-2025-001": {
    datePlanted: "2025-01-01",
    totalSeeds: 30,
    germinationCount: 26,
    deltaFromYesterday: "+2 from yesterday",
    predictedGermination: "Jan 08, 2025", // Changed from harvest
    modelAccuracy: "95.4%",
  },
  "B-2025-002": {
    datePlanted: "2025-02-14",
    totalSeeds: 50,
    germinationCount: 42,
    deltaFromYesterday: "+5 from yesterday",
    predictedGermination: "Feb 20, 2025", // Changed from harvest
    modelAccuracy: "91.2%",
  },
  "B-2025-003": {
    datePlanted: "2025-03-01",
    totalSeeds: 40,
    germinationCount: 15,
    deltaFromYesterday: "+15 from yesterday",
    predictedGermination: "Mar 07, 2025", // Changed from harvest
    modelAccuracy: "88.9%",
  }
};

export default function PredictionPage() {
  const [selectedBatch, setSelectedBatch] = useState("B-2025-001");
  const data = mockDatabase[selectedBatch];

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Germination Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <h3 className="fw-bold mb-4">Germination Prediction Analytics</h3>

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
                    title="Current Germination"
                    value={data.germinationCount}
                    subText={data.deltaFromYesterday}
                  />
                </Col>
              </Row>

              <Row className="g-4">
                <Col md={6}>
                  {/* Changed Label to Predicted Germination */}
                  <PredictionBottomBar
                    leftLabel="Predicted Germination"
                    rightValue={data.predictedGermination}
                    variant="dark"
                  />
                </Col>
                <Col md={6}>
                  <PredictionBottomBar
                    leftLabel="Prediction Accuracy"
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