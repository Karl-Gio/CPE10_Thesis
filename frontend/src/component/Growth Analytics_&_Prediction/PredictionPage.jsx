import React, { useEffect, useState, useMemo } from "react";
import { Container, Card, Row, Col, Form, Table, Badge, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

/* ---------------- HELPERS (Keep these) ---------------- */
function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
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

export default function PredictionPage() {
  const [batches, setBatches] = useState([]); // List for dropdown
  const [selectedBatchId, setSelectedBatchId] = useState(""); 
  const [batchData, setBatchData] = useState(null); // Details of selected batch
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch all batches on component mount
  useEffect(() => {
    axios.get("http://localhost:8000/api/batches") // Change to your actual API URL
      .then(res => {
        setBatches(res.data);
        if (res.data.length > 0) {
          setSelectedBatchId(res.data[0].batch_id); // Set first batch as default
        }
        setLoading(false);
      })
      .catch(err => {
        setError("Could not load batches.");
        setLoading(false);
      });
  }, []);

  // 2. Fetch specific batch details when dropdown changes
  useEffect(() => {
    if (!selectedBatchId) return;

    axios.get(`http://localhost:8000/api/batches/${selectedBatchId}`)
      .then(res => {
        setBatchData(res.data);
      })
      .catch(err => console.error("Error fetching batch details", err));
  }, [selectedBatchId]);

  // 3. Derived Calculations
  const analytics = useMemo(() => {
    if (!batchData) return null;

    const pDate = addDays(batchData.date_planted, batchData.predicted_days);
    const actualDays = calculateDiffInDays(batchData.date_planted, batchData.actual_germination_date);
    const variance = calculateDiffInDays(pDate, batchData.actual_germination_date);

    return {
      predictedDate: pDate,
      actualDays: actualDays,
      variance: variance,
      status: batchData.actual_germination_date ? "Success" : "Pending"
    };
  }, [batchData]);

  if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />
      <div className="flex-grow-1">
        <DashboardHeader title="Germination Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          {batchData && (
            <Card className="shadow-sm border-0 rounded-4">
              <Card.Body className="p-4">
                <h3 className="fw-bold mb-4">Batch Germination Time Analysis</h3>
                
                {/* SELECTOR STRIP */}
                <Card className="border-0 shadow-sm rounded-4 mb-4 bg-light">
                  <Card.Body className="p-4">
                    <Row className="g-4 align-items-center">
                      <Col md={4}>
                        <div className="text-uppercase small text-muted fw-bold mb-1">Select Batch ID</div>
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
                      <Col md={4}>
                        <div className="text-uppercase small text-muted fw-bold mb-1">Date Planted</div>
                        <div className="h5 fw-bold mb-0">{formatDate(batchData.date_planted)}</div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* STAT CARDS */}
                <Row className="g-4 mb-4">
                  <Col md={4}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-4">
                      <div className="text-muted fw-semibold small text-uppercase">Predicted Duration</div>
                      <div className="display-6 fw-bold my-2 text-primary">{batchData.predicted_days} Days</div>
                      <div className="small text-muted">Random Forest Estimate</div>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-4">
                      <div className="text-muted fw-semibold small text-uppercase">Predicted Date</div>
                      <div className="display-6 fw-bold my-2" style={{color: '#6366f1'}}>{formatDate(analytics.predictedDate)}</div>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-4">
                      <div className="text-muted fw-semibold small text-uppercase">Actual Duration</div>
                      <div className="display-6 fw-bold my-2 text-success">{analytics.actualDays ? `${analytics.actualDays} Days` : "—"}</div>
                    </Card>
                  </Col>
                </Row>

                {/* VARIANCE BAR */}
                <Row className="g-4 mb-5">
                   <Col md={6}>
                      <Card className="border-0 shadow-sm rounded-4 bg-dark text-white p-3">
                          <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold text-uppercase small" style={{opacity: 0.75}}>Prediction Variance (Error)</span>
                              <span className="h4 mb-0 fw-bold text-warning">
                                {analytics.variance !== null ? `${analytics.variance} Day(s)` : "Calculating..."}
                              </span>
                          </div>
                      </Card>
                   </Col>
                   <Col md={6}>
                      <Card className="border-0 shadow-sm rounded-4 text-white p-3" style={{background: "#0a9b67"}}>
                          <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold text-uppercase small">Status</span>
                              <span className="h4 mb-0 fw-bold">{analytics.status}</span>
                          </div>
                      </Card>
                   </Col>
                </Row>

                {/* DETAILS TABLE */}
                <h5 className="fw-bold mb-3">Logs & Validation</h5>
                <div className="table-responsive">
                  <Table hover className="align-middle bg-white rounded-3 overflow-hidden border">
                    <thead className="table-light">
                      <tr>
                        <th>Batch ID</th>
                        <th>Predicted Date</th>
                        <th>Actual Date</th>
                        <th>Error</th>
                        <th>Image Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-bold">{batchData.batch_id}</td>
                        <td className="text-primary">{formatDate(analytics.predictedDate)}</td>
                        <td className="text-success">{formatDate(batchData.actual_germination_date)}</td>
                        <td>{analytics.variance ?? "—"}</td>
                        <td>
                          <Badge bg={batchData.actual_germination_date ? "success" : "secondary"}>
                            {batchData.actual_germination_date ? "Validated by CV" : "Pending CV Detection"}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Container>
      </div>
    </div>
  );
}