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
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { fetchBatches, fetchBatchDetails } from "./predictionService";
import { formatDateTime, formatDuration, formatVariance, getAnalytics, } from "./predictionUtils";

export default function PredictionPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbLatency, setDbLatency] = useState(0);

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setLoading(true);
        setError(null);

        const batchList = await fetchBatches();
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

    loadBatches();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;

    const loadBatchDetails = async () => {
      try {
        setDetailsLoading(true);

        const startTime = performance.now();
        const data = await fetchBatchDetails(selectedBatchId);
        const endTime = performance.now();

        setBatchData(data);
        setDbLatency(Math.round(endTime - startTime));
      } catch (err) {
        console.error("Error fetching batch details:", err);
        setBatchData(null);
      } finally {
        setDetailsLoading(false);
      }
    };

    loadBatchDetails();
  }, [selectedBatchId]);

  const analytics = useMemo(() => getAnalytics(batchData), [batchData]);

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
                <Badge
                  bg="light"
                  className="text-muted border fw-normal py-2 px-3"
                >
                  <i className="bi bi-cpu me-1"></i>
                  Server Response:{" "}
                  <span className="fw-bold text-dark">{dbLatency}ms</span>
                </Badge>
              </div>

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

                  <h5 className="fw-bold mb-3">Model Performance Metrics</h5>
                  <div className="table-responsive">
                    <Table
                      hover
                      className="align-middle bg-white rounded-3 overflow-hidden border"
                    >
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
                    <strong>Insight:</strong> This shows how close the Random
                    Forest prediction is to the actual plant growth. A smaller
                    difference means the system is accurate and the growing
                    conditions are well controlled.
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