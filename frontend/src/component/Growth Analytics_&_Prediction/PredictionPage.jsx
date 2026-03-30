import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Form,
  Table,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import axios from "axios";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

/* ---------------- DATE / TIME HELPERS ---------------- */

function parseSQLDate(dateString) {
  if (!dateString) return null;

  // Converts "2026-01-03 14:57:36" -> "2026-01-03T14:57:36"
  // so JS parses it more reliably
  const parsed = new Date(dateString.replace(" ", "T"));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(dateInput) {
  if (!dateInput) return "—";

  const date =
    typeof dateInput === "string" ? parseSQLDate(dateInput) : dateInput;

  if (!date) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(decimalDays) {
  if (decimalDays === null || decimalDays === undefined || isNaN(decimalDays)) {
    return "---";
  }

  const totalHours = Math.round(parseFloat(decimalDays) * 24);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return `${days}d, ${hours}hr${hours !== 1 ? "s" : ""}`;
}

function formatVariance(variance) {
  if (variance === null || variance === undefined || isNaN(variance)) {
    return "N/A";
  }

  const numericVariance = parseFloat(variance);

  if (numericVariance === 0) {
    return "Perfect Match";
  }

  const absHours = Math.round(Math.abs(numericVariance) * 24);
  const days = Math.floor(absHours / 24);
  const hours = absHours % 24;
  const timeStr = `${days}d, ${hours}h`;

  if (numericVariance > 0) return `+${timeStr} (Delayed)`;
  return `-${timeStr} (Ahead)`;
}

function addDecimalDays(dateInput, decimalDays) {
  const date =
    typeof dateInput === "string" ? parseSQLDate(dateInput) : dateInput;

  if (!date || decimalDays === null || decimalDays === undefined || isNaN(decimalDays)) {
    return null;
  }

  const millisecondsToAdd = parseFloat(decimalDays) * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + millisecondsToAdd);
}

function calculateDiffInDays(startDate, endDate) {
  const start =
    typeof startDate === "string" ? parseSQLDate(startDate) : startDate;
  const end =
    typeof endDate === "string" ? parseSQLDate(endDate) : endDate;

  if (!start || !end) return null;

  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

/* ---------------- COMPONENT ---------------- */

export default function PredictionPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbLatency, setDbLatency] = useState(0);

  /* ---------------- FETCH ALL BATCHES ---------------- */
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get("http://localhost:8000/api/batches");
        const batchList = Array.isArray(res.data) ? res.data : [];

        setBatches(batchList);

        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0].batch_id);
        }
      } catch (err) {
        console.error("Error loading batches:", err);
        setError("Could not load batches.");
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  /* ---------------- FETCH SELECTED BATCH DETAILS ---------------- */
  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchBatchDetails = async () => {
      try {
        setDetailsLoading(true);

        const startTime = performance.now();
        const res = await axios.get(
          `http://localhost:8000/api/batches/${selectedBatchId}`
        );
        const endTime = performance.now();

        setBatchData(res.data);
        setDbLatency(Math.round(endTime - startTime));
      } catch (err) {
        console.error("Error fetching batch details:", err);
        setBatchData(null);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchBatchDetails();
  }, [selectedBatchId]);

  /* ---------------- ANALYTICS ---------------- */
  const analytics = useMemo(() => {
    if (!batchData) return null;

    const predictedDays = parseFloat(batchData.predicted_days);
    const plantedDate = parseSQLDate(batchData.date_planted);
    const actualDate = parseSQLDate(batchData.actual_germination_date);

    const predictedDate =
      plantedDate && !isNaN(predictedDays)
        ? addDecimalDays(plantedDate, predictedDays)
        : null;

    const actualDays =
      plantedDate && actualDate
        ? calculateDiffInDays(plantedDate, actualDate)
        : null;

    const variance =
      actualDays !== null && !isNaN(predictedDays)
        ? actualDays - predictedDays
        : null;

    return {
      predictedDays: !isNaN(predictedDays) ? predictedDays : null,
      predictedDate,
      actualDays,
      variance,
      isCompleted: !!actualDate,
    };
  }, [batchData]);

  if (loading) {
    return (
      <div className="p-5 text-center">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        {error}
      </Alert>
    );
  }

  return (
    <div
      className="d-flex"
      style={{ background: "#f5f7fb", minHeight: "100vh" }}
    >
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Germination Analytics & Prediction" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">Optimization Analysis</h3>
                <Badge bg="light" className="text-muted border fw-normal py-2 px-3">
                  <i className="bi bi-cpu me-1"></i>
                  Server Response:{" "}
                  <span className="fw-bold text-dark">{dbLatency}ms</span>
                </Badge>
              </div>

              {/* BATCH SELECTOR */}
              <Card className="border-0 shadow-sm rounded-4 mb-4 bg-light">
                <Card.Body className="p-3">
                  <Row className="g-3 align-items-center">
                    <Col md={6}>
                      <div className="text-uppercase small text-muted fw-bold mb-1">
                        Active Batch
                      </div>
                      <Form.Select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="fw-bold border-0 shadow-sm"
                      >
                        {batches.map((batch) => (
                          <option key={batch.batch_id} value={batch.batch_id}>
                            {batch.batch_id}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    <Col md={6}>
                      <div className="text-uppercase small text-muted fw-bold mb-1">
                        Status
                      </div>
                      <Badge
                        bg={analytics?.isCompleted ? "success" : "warning"}
                        className="px-3 py-2"
                      >
                        {analytics?.isCompleted
                          ? "✅ GERMINATION VALIDATED"
                          : "⏳ GROWTH IN PROGRESS"}
                      </Badge>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {detailsLoading ? (
                <div className="p-5 text-center">
                  <Spinner animation="border" variant="success" />
                </div>
              ) : batchData && analytics ? (
                <>
                  {/* STAT CARDS */}
                  <Row className="g-4 mb-4">
                    <Col md={3}>
                      <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-primary border-4">
                        <div className="text-muted fw-semibold small text-uppercase">
                          AI Prediction
                        </div>
                        <div className="h4 fw-bold my-2 text-primary">
                          {formatDuration(analytics.predictedDays)}
                        </div>
                        <div className="small text-muted">Random Forest</div>
                      </Card>
                    </Col>

                    <Col md={3}>
                      <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-info border-4">
                        <div className="text-muted fw-semibold small text-uppercase">
                          Target Date
                        </div>
                        <div className="h5 fw-bold my-3 text-dark">
                          {formatDateTime(analytics.predictedDate)}
                        </div>
                        <div className="small text-muted">Estimated Sprout</div>
                      </Card>
                    </Col>

                    <Col md={3}>
                      <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-success border-4">
                        <div className="text-muted fw-semibold small text-uppercase">
                          Actual Growth
                        </div>
                        <div className="h4 fw-bold my-2 text-success">
                          {analytics.actualDays !== null
                            ? formatDuration(analytics.actualDays)
                            : "---"}
                        </div>
                        <div className="small text-muted">YOLOv8 Validated</div>
                      </Card>
                    </Col>

                    <Col md={3}>
                      <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3 border-bottom border-danger border-4">
                        <div className="text-muted fw-semibold small text-uppercase">
                          Model Variance
                        </div>
                        <div
                          className={`h4 fw-bold my-2 ${
                            analytics.variance !== null &&
                            Math.abs(analytics.variance) < 0.5
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {formatVariance(analytics.variance)}
                        </div>
                        <div className="small">
                          {analytics.variance !== null &&
                          Math.abs(analytics.variance) < 1 ? (
                            <Badge bg="success-subtle" className="text-success">
                              High Accuracy
                            </Badge>
                          ) : (
                            <Badge bg="warning-subtle" className="text-warning">
                              Check Sensors
                            </Badge>
                          )}
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* TABLE */}
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
                          <td>{formatDateTime(batchData.date_planted)}</td>
                          <td className="text-primary fw-semibold">
                            {formatDateTime(analytics.predictedDate)}
                          </td>
                          <td className="text-success fw-semibold">
                            {batchData.actual_germination_date
                              ? formatDateTime(batchData.actual_germination_date)
                              : "Awaiting Detection..."}
                          </td>
                          <td className="text-center">
                            <Badge
                              bg={
                                dbLatency < 200
                                  ? "success-subtle"
                                  : "warning-subtle"
                              }
                              className="text-dark border"
                            >
                              {dbLatency} ms
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>

                  <Alert
                    variant="info"
                    className="mt-3 border-0 shadow-sm rounded-4 small"
                  >
                    <strong>Thesis Insight:</strong> The model variance represents
                    the delta between the{" "}
                    <strong>Random Forest Regressor</strong> and{" "}
                    <strong>YOLOv8 Computer Vision</strong> validation. Low
                    variance (&lt; 1.0 day) indicates high environmental control
                    efficiency.
                  </Alert>
                </>
              ) : (
                <Alert variant="secondary" className="border-0 rounded-4">
                  No batch data available.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}