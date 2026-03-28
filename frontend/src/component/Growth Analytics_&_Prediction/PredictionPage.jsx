import React, { useMemo, useState } from "react";
import { Container, Card, Row, Col, Form, Table, Badge } from "react-bootstrap";

// Layout Components
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

/* ---------------- HELPERS ---------------- */

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function addDays(date, days) {
  if (!date || days === undefined) return null;
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function calculateDiffInDays(date1, date2) {
  if (!date1 || !date2) return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/* ---------------- MOCK DATABASE ---------------- */

const mockDatabase = {
  "B-2026-001": {
    datePlanted: "2026-03-01",
    predictedDaysToGerminate: 7, 
    actualGerminationDate: "2026-03-09", 
  },
  "B-2026-002": {
    datePlanted: "2026-03-10",
    predictedDaysToGerminate: 5,
    actualGerminationDate: "2026-03-15",
  },
  "B-2026-003": {
    datePlanted: "2026-03-20",
    predictedDaysToGerminate: 6,
    actualGerminationDate: null, 
  },
};

/* ---------------- MAIN PAGE ---------------- */

export default function PredictionPage() {
  const [selectedBatch, setSelectedBatch] = useState("B-2026-001");
  const availableBatches = Object.keys(mockDatabase);
  const data = mockDatabase[selectedBatch];

  // Logic calculations for the selected batch
  const predictedDate = addDays(data.datePlanted, data.predictedDaysToGerminate);
  const actualDays = calculateDiffInDays(data.datePlanted, data.actualGerminationDate);
  const dateError = calculateDiffInDays(predictedDate, data.actualGerminationDate);

  // Memoized row for the table - now filtered to only show the selected batch
  const selectedTableRow = useMemo(() => {
    const item = mockDatabase[selectedBatch];
    const pDate = addDays(item.datePlanted, item.predictedDaysToGerminate);
    const error = calculateDiffInDays(pDate, item.actualGerminationDate);
    
    return {
      id: selectedBatch,
      datePlanted: item.datePlanted,
      pDays: item.predictedDaysToGerminate,
      pDate: formatDate(pDate),
      aDate: formatDate(item.actualGerminationDate),
      error: error !== null ? `${error} day${error !== 1 ? "s" : ""}` : "—",
      status: item.actualGerminationDate ? "Success" : "Pending"
    };
  }, [selectedBatch]); // Re-calculates whenever the dropdown changes

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Germination Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <h3 className="fw-bold mb-4">Batch Germination Time Analysis</h3>
              
              {/* META INFO STRIP */}
              <Card className="border-0 shadow-sm rounded-4 mb-4 bg-light">
                <Card.Body className="p-4">
                  <Row className="g-4 align-items-center">
                    <Col md={4}>
                      <div className="text-uppercase small text-muted fw-bold mb-1">Select Batch ID</div>
                      <Form.Select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="fw-bold border-0 shadow-sm"
                      >
                        {availableBatches.map((batch) => (
                          <option key={batch} value={batch}>{batch}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <div className="text-uppercase small text-muted fw-bold mb-1">Date Planted</div>
                      <div className="h5 fw-bold mb-0">{formatDate(data.datePlanted)}</div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* STAT CARDS */}
              <Row className="g-4 mb-4">
                <Col md={4}>
                  <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-4">
                    <div className="text-muted fw-semibold small text-uppercase">Predicted Duration</div>
                    <div className="display-6 fw-bold my-2 text-primary">{data.predictedDaysToGerminate} Days</div>
                    <div className="small text-muted">AI Estimated Time</div>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-4">
                    <div className="text-muted fw-semibold small text-uppercase">Predicted Date</div>
                    <div className="display-6 fw-bold my-2" style={{color: '#6366f1'}}>{formatDate(predictedDate)}</div>
                    <div className="small text-muted">Expected Target</div>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-4">
                    <div className="text-muted fw-semibold small text-uppercase">Actual Duration</div>
                    <div className="display-6 fw-bold my-2 text-success">{actualDays ? `${actualDays} Days` : "—"}</div>
                    <div className="small text-muted">{actualDays ? "Recorded Result" : "Waiting for detection..."}</div>
                  </Card>
                </Col>
              </Row>

              {/* ACCURACY & STATUS BAR */}
              <Row className="g-4 mb-5">
                 <Col md={6}>
                    <Card className="border-0 shadow-sm rounded-4 bg-dark text-white p-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold text-uppercase small" style={{opacity: 0.75}}>Variance (Error)</span>
                            <span className="h4 mb-0 fw-bold text-warning">{dateError !== null ? `${dateError} Day(s)` : "—"}</span>
                        </div>
                    </Card>
                 </Col>
                 <Col md={6}>
                    <Card className="border-0 shadow-sm rounded-4 text-white p-3" style={{background: "#0a9b67"}}>
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold text-uppercase small">Batch Status</span>
                            <span className="h4 mb-0 fw-bold">{data.actualGerminationDate ? "Germinated" : "In Progress"}</span>
                        </div>
                    </Card>
                 </Col>
              </Row>

              {/* FILTERED HISTORY TABLE */}
              <h5 className="fw-bold mb-3">Selected Batch Details</h5>
              <div className="table-responsive">
                <Table hover bordered className="align-middle bg-white rounded-3 overflow-hidden">
                  <thead className="table-light">
                    <tr>
                      <th>Batch ID</th>
                      <th>Date Planted</th>
                      <th>Predicted Days</th>
                      <th>Predicted Date</th>
                      <th>Actual Date</th>
                      <th>Error</th>
                      <th>Sync Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-bold">{selectedTableRow.id}</td>
                      <td>{formatDate(selectedTableRow.datePlanted)}</td>
                      <td>{selectedTableRow.pDays} days</td>
                      <td className="text-primary fw-semibold">{selectedTableRow.pDate}</td>
                      <td className="text-success fw-semibold">{selectedTableRow.aDate}</td>
                      <td>{selectedTableRow.error}</td>
                      <td>
                        <Badge bg={selectedTableRow.status === "Success" ? "success" : "warning"} pill>
                          {selectedTableRow.status}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>

            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}