import React, { useEffect, useMemo, useState } from "react";
import { Dropdown } from "react-bootstrap";
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
import {
  formatDateTime,
  formatDuration,
  formatVariance,
  getAnalytics,
} from "./predictionUtils";
import "./PredictionPage.css";

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
      <div className="prediction-page__state prediction-page__state--fullscreen">
        <Spinner animation="border" className="prediction-page__spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="prediction-page__state-shell">
        <Alert
          variant="danger"
          className="prediction-page__alert prediction-page__alert--error"
        >
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="prediction-page d-flex">
      <SideBar />

      <div className="prediction-page__content flex-grow-1">
        <DashboardHeader title="Germination Analytics & Prediction" />

        <Container fluid className="prediction-page__container">
          <Card className="prediction-page__panel">
            <Card.Body className="prediction-page__panel-body">
              <div className="prediction-page__panel-header d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                  <div className="prediction-page__eyebrow">
                    Prediction Overview
                  </div>
                  <h3 className="prediction-page__title mb-0">
                    Optimization Analysis
                  </h3>
                </div>

                <div className="prediction-page__latency-chip">
                  <span className="prediction-page__latency-label">
                    Server Response
                  </span>
                  <span className="prediction-page__latency-value">
                    {dbLatency}ms
                  </span>
                </div>
              </div>

              <Card className="prediction-page__filter-card mb-4">
                <Card.Body className="prediction-page__filter-body">
                  <Row className="g-3 align-items-end">
                    <Col md={7}>
                      <Form.Group>
                        <Form.Label className="prediction-page__field-label">
                          Active Batch
                        </Form.Label>

                        <Dropdown className="prediction-page__dropdown">
                          <Dropdown.Toggle className="prediction-page__dropdown-toggle w-100 text-start">
                            {selectedBatchId || "Select Batch"}
                          </Dropdown.Toggle>

                          <Dropdown.Menu className="prediction-page__dropdown-menu w-100">
                            {batches.map((batch) => (
                              <Dropdown.Item
                                key={batch.batch_id}
                                onClick={() =>
                                  setSelectedBatchId(batch.batch_id)
                                }
                                active={selectedBatchId === batch.batch_id}
                              >
                                {batch.batch_id}
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown>
                      </Form.Group>
                    </Col>

                    <Col md={5}>
                      <div className="prediction-page__field-label">Status</div>
                      <div className="prediction-page__status-wrap">
                        <Badge
                          className={`prediction-page__status-badge ${
                            analytics?.isCompleted
                              ? "prediction-page__status-badge--success"
                              : "prediction-page__status-badge--warning"
                          }`}
                        >
                          {analytics?.isCompleted
                            ? "GERMINATION VALIDATED"
                            : "GROWTH IN PROGRESS"}
                        </Badge>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {detailsLoading ? (
                <div className="prediction-page__state">
                  <Spinner
                    animation="border"
                    className="prediction-page__spinner"
                  />
                </div>
              ) : batchData && analytics ? (
                <>
                  <Row className="g-4 mb-4">
                    <Col md={6} xl={3}>
                      <Card className="prediction-metric-card prediction-metric-card--primary h-100">
                        <Card.Body className="prediction-metric-card__body">
                          <div className="prediction-metric-card__label">
                            AI Prediction
                          </div>
                          <div className="prediction-metric-card__value">
                            {formatDuration(analytics.predictedDays)}
                          </div>
                          <div className="prediction-metric-card__meta">
                            Random Forest
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6} xl={3}>
                      <Card className="prediction-metric-card prediction-metric-card--info h-100">
                        <Card.Body className="prediction-metric-card__body">
                          <div className="prediction-metric-card__label">
                            Target Date
                          </div>
                          <div className="prediction-metric-card__value prediction-metric-card__value--date">
                            {formatDateTime(analytics.predictedDate)}
                          </div>
                          <div className="prediction-metric-card__meta">
                            Estimated Sprout
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6} xl={3}>
                      <Card className="prediction-metric-card prediction-metric-card--success h-100">
                        <Card.Body className="prediction-metric-card__body">
                          <div className="prediction-metric-card__label">
                            Actual Growth
                          </div>
                          <div className="prediction-metric-card__value">
                            {analytics.actualDays !== null
                              ? formatDuration(analytics.actualDays)
                              : "---"}
                          </div>
                          <div className="prediction-metric-card__meta">
                            YOLOv8 Validated
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6} xl={3}>
                      <Card className="prediction-metric-card prediction-metric-card--danger h-100">
                        <Card.Body className="prediction-metric-card__body">
                          <div className="prediction-metric-card__label">
                            Model Variance
                          </div>
                          <div
                            className={`prediction-metric-card__value ${
                              analytics.variance !== null &&
                              Math.abs(analytics.variance) < 0.5
                                ? "prediction-metric-card__value--good"
                                : "prediction-metric-card__value--danger"
                            }`}
                          >
                            {formatVariance(analytics.variance)}
                          </div>
                          <div className="prediction-metric-card__meta">
                            {analytics.variance !== null &&
                            Math.abs(analytics.variance) < 1 ? (
                              <Badge className="prediction-page__mini-badge prediction-page__mini-badge--success">
                                High Accuracy
                              </Badge>
                            ) : (
                              <Badge className="prediction-page__mini-badge prediction-page__mini-badge--warning">
                                Check Sensors
                              </Badge>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <div className="prediction-page__section mb-3">
                    <h5 className="prediction-page__section-title mb-0">
                      Model Performance Metrics
                    </h5>
                  </div>

                  <div className="prediction-page__table-shell table-responsive">
                    <Table
                      hover
                      className="prediction-page__table align-middle mb-0"
                    >
                      <thead>
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
                          <td className="prediction-page__cell-strong">
                            {batchData.batch_id}
                          </td>
                          <td>{formatDateTime(batchData.date_planted)}</td>
                          <td className="prediction-page__text-primary">
                            {formatDateTime(analytics.predictedDate)}
                          </td>
                          <td className="prediction-page__text-success">
                            {batchData.actual_germination_date
                              ? formatDateTime(
                                  batchData.actual_germination_date,
                                )
                              : "Awaiting Detection..."}
                          </td>
                          <td className="text-center">
                            <Badge
                              className={`prediction-page__mini-badge ${
                                dbLatency < 200
                                  ? "prediction-page__mini-badge--success"
                                  : "prediction-page__mini-badge--warning"
                              }`}
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
                    className="prediction-page__alert prediction-page__alert--info mt-4"
                  >
                    <strong>Insight:</strong> This shows how close the Random
                    Forest prediction is to the actual plant growth. A smaller
                    difference means the system is accurate and the growing
                    conditions are well controlled.
                  </Alert>
                </>
              ) : (
                <Alert
                  variant="secondary"
                  className="prediction-page__alert prediction-page__alert--empty"
                >
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
