import React, { useEffect, useState, useMemo } from "react";
import { Container, Card, Row, Col, Form, Table, Badge, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

/* ---------------- HELPERS ---------------- */
function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", { 
    month: "short", 
    day: "2-digit", 
    year: "numeric" 
  });
}

function addDays(date, days) {
  if (!date || days === undefined) return null;
  const result = new Date(date);
  // Using parseFloat because ML predictions are often decimals
  result.setDate(result.getDate() + Math.round(parseFloat(days)));
  return result;
}

function calculateDiffInDays(date1, date2) {
  if (!date1 || !date2) return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function PredictionPage() {
  const [batches, setBatches] = useState([]); 
  const [selectedBatchId, setSelectedBatchId] = useState(""); 
  const [batchData, setBatchData] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbLatency, setDbLatency] = useState(0);

  // 1. Fetch all batches
  useEffect(() => {
    axios.get("http://localhost:8000/api/batches")
      .then(res => {
        setBatches(res.data);
        if (res.data.length > 0) setSelectedBatchId(res.data[0].batch_id);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load batches.");
        setLoading(false);
      });
  }, []);

  // 2. Fetch details + Latency check
  useEffect(() => {
    if (!selectedBatchId) return;
    const startTime = performance.now();

    axios.get(`http://localhost:8000/api/batches/${selectedBatchId}`)
      .then(res => {
        const endTime = performance.now();
        setBatchData(res.data);
        setDbLatency(Math.round(endTime - startTime));
      })
      .catch(err => console.error("Error fetching batch details", err));
  }, [selectedBatchId]);

  // 3. Thesis Analytics: AI vs Reality
  const analytics = useMemo(() => {
    if (!batchData) return null;

    const pDays = parseFloat(batchData.predicted_days) || 0;
    const pDate = addDays(batchData.date_planted, pDays);
    const actualDays = calculateDiffInDays(batchData.date_planted, batchData.actual_germination_date);
    
    // Variance calculation: Positive means reality took longer than AI predicted
    const variance = (actualDays && pDays) ? (actualDays - pDays).toFixed(2) : null;

    return {
      predictedDate: pDate,
      actualDays: actualDays,
      variance: variance,
      isCompleted: !!batchData.actual_germination_date
    };
  }, [batchData]);

  if (loading) return <div className="p-5 text-center"><Spinner animation="border" variant="success" /></div>;
  if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />
      <div className="flex-grow-1">
        <DashboardHeader title="Germination Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          {batchData && analytics && (
            <Card className="shadow-sm border-0 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold mb-0">Optimization Analysis</h3>
                    <Badge bg="light" className="text-muted border fw-normal py-2 px-3">
                        <i className="bi bi-cpu me-1"></i>
                        Server Response: <span className="fw-bold text-dark">{dbLatency}ms</span>
                    </Badge>
                </div>
                
                {/* BATCH SELECTOR */}
                <Card className="border-0 shadow-sm rounded-4 mb-4 bg-light">
                  <Card.Body className="p-3">
                    <Row className="g-3 align-items-center">
                      <Col md={6}>
                        <div className="text-uppercase small text-muted fw-bold mb-1">Active Batch</div>
                        <Form.Select
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="fw-bold border-0 shadow-sm"
                        >
                          {batches.map((b) => (
                            <option key={b.batch_id} value={b.batch_id}>{b.batch_id}</option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col md={6}>
                        <div className="text-uppercase small text-muted fw-bold mb-1">Status</div>
                        <Badge bg={analytics.isCompleted ? "success" : "warning"} className="px-3 py-2">
                          {analytics.isCompleted ? "✅ GERMINATION VALIDATED" : "⏳ GROWTH IN PROGRESS"}
                        </Badge>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* THESIS STAT CARDS */}
                <Row className="g-4 mb-4">
                  <Col md={3}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-primary border-4">
                      <div className="text-muted fw-semibold small text-uppercase">AI Prediction</div>
                      <div className="h2 fw-bold my-2 text-primary">{batchData.predicted_days}d</div>
                      <div className="small text-muted">Random Forest</div>
                    </Card>
                  </Col>
                  
                  <Col md={3}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-indigo border-4">
                      <div className="text-muted fw-semibold small text-uppercase">Target Date</div>
                      <div className="h4 fw-bold my-3 text-dark">{formatDate(analytics.predictedDate)}</div>
                      <div className="small text-muted">Estimated Sprout</div>
                    </Card>
                  </Col>

                  <Col md={3}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-success border-4">
                      <div className="text-muted fw-semibold small text-uppercase">Actual Growth</div>
                      <div className="h2 fw-bold my-2 text-success">
                        {analytics.actualDays ? `${analytics.actualDays}d` : "---"}
                      </div>
                      <div className="small text-muted">YOLOv8 Validated</div>
                    </Card>
                  </Col>

                  <Col md={3}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-danger border-4">
                      <div className="text-muted fw-semibold small text-uppercase">Model Variance</div>
                      <div className={`h2 fw-bold my-2 ${Math.abs(analytics.variance) < 1 ? 'text-success' : 'text-danger'}`}>
                        {analytics.variance ? `${analytics.variance}d` : "N/A"}
                      </div>
                      <div className="small text-muted">Prediction Error</div>
                    </Card>
                  </Col>
                </Row>

                {/* DETAILED LOG TABLE */}
                <h5 className="fw-bold mb-3">Model Performance Metrics</h5>
                <div className="table-responsive">
                  <Table hover className="align-middle bg-white rounded-3 overflow-hidden border">
                    <thead className="table-light text-uppercase small">
                      <tr>
                        <th>Batch Identification</th>
                        <th>Planted</th>
                        <th>ML Predicted Date</th>
                        <th>Vision Actual Date</th>
                        <th className="text-center">System Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-bold">{batchData.batch_id}</td>
                        <td>{formatDate(batchData.date_planted)}</td>
                        <td className="text-primary fw-semibold">{formatDate(analytics.predictedDate)}</td>
                        <td className="text-success fw-semibold">
                          {batchData.actual_germination_date ? formatDate(batchData.actual_germination_date) : "Awaiting Detection..."}
                        </td>
                        <td className="text-center">
                          <Badge bg={dbLatency < 200 ? "success-subtle" : "warning-subtle"} className="text-dark border">
                            {dbLatency} ms
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>

                <Alert variant="info" className="mt-3 border-0 shadow-sm rounded-4 small">
                  <strong>Thesis Insight:</strong> The model variance represents the delta between the <strong>Random Forest Regressor</strong> and <strong>YOLOv8 Computer Vision</strong> validation. Low variance (&lt; 1.0) indicates high environmental control efficiency.
                </Alert>
              </Card.Body>
            </Card>
          )}
        </Container>
      </div>
    </div>
  );
}