import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Alert,
  Button,
  Row,
  Col,
  Form,
  ListGroup,
} from "react-bootstrap";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { useTestingLogic } from "./useTestingLogic";
import "./TestingPage.css";

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  accent = "",
  helperText = "",
  rangeText = "",
}) => {
  const labelClass =
    accent === "param-card-accent-success"
      ? "param-card__label param-card__label-success"
      : accent === "param-card-accent-warning"
        ? "param-card__label param-card__label-warning"
        : accent === "param-card-accent-primary"
          ? "param-card__label param-card__label-primary"
          : "param-card__label";

  return (
    <Card className={`param-card h-100 ${accent}`}>
      <Card.Body className="param-card__body">
        <div className="param-card__label-wrap">
          <div className={labelClass}>{label}</div>
          {rangeText ? <div className="param-card__range">{rangeText}</div> : null}
        </div>

        <Form.Control
          type={type}
          value={value}
          onChange={onChange}
          className="param-input-single"
        />

        {helperText ? (
          <small
            className={`param-helper-text ${
              helperText.toLowerCase().includes("exists")
                ? "param-helper-text-danger"
                : ""
            }`}
          >
            {helperText}
          </small>
        ) : null}
      </Card.Body>
    </Card>
  );
};

const ToggleCard = ({
  label,
  value,
  onChange,
  accent = "param-card-accent-primary",
}) => {
  const labelClass =
    accent === "param-card-accent-success"
      ? "param-card__label param-card__label-success"
      : accent === "param-card-accent-warning"
        ? "param-card__label param-card__label-warning"
        : accent === "param-card-accent-primary"
          ? "param-card__label param-card__label-primary"
          : "param-card__label";

  return (
    <Card className={`param-card h-100 ${accent}`}>
      <Card.Body className="param-card__body">
        <div className={labelClass}>{label}</div>

        <Form.Select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="param-input-single"
        >
          <option value={0}>OFF</option>
          <option value={1}>ON</option>
        </Form.Select>
      </Card.Body>
    </Card>
  );
};

export default function TestingPage() {
  const {
    values,
    existingBatchNames,
    sending,
    shutdownBusy,
    statusMsg,
    setStatusMsg,
    setField,
    allRecords,
    setValues,
    onSendParams,
    onSendHardware,
    onSequentialShutdown,
  } = useTestingLogic();

  const [filteredBatches, setFilteredBatches] = useState([]);
  const [batchInput, setBatchInput] = useState(values.batch);

  useEffect(() => {
    if (allRecords.length > 0) {
      setBatchInput(allRecords[0].batch);
    }
  }, [allRecords]);

  const handleBatchInputChange = (e) => {
    const query = e.target.value;
    setBatchInput(query);

    if (query) {
      const filtered = allRecords.filter((record) =>
        record.batch?.toLowerCase().startsWith(query.toLowerCase()),
      );
      setFilteredBatches(filtered);
    } else {
      setFilteredBatches([]);
    }
  };

  const handleBatchSelect = (batchName) => {
    setBatchInput(batchName);
    setFilteredBatches([]);

    const selectedBatch = allRecords.find(
      (record) => record.batch === batchName,
    );

    if (selectedBatch) {
      setValues((prev) => ({
        ...prev,
        batch: selectedBatch.batch ?? "",
        ambientTemp: selectedBatch.ambient_temp ?? "",
        ambientHum: selectedBatch.humidity ?? "",
        soilMoisture: selectedBatch.soil_moisture ?? "",
        soilTemp: selectedBatch.soil_temp ?? "",
        duration: selectedBatch.duration ?? "",
        paramUv: Number(selectedBatch.uv ?? 0),
        paramLed: Number(selectedBatch.led ?? 0),
      }));
    }
  };

  const isDuplicateBatch = existingBatchNames.includes(
    batchInput.trim().toLowerCase(),
  );

  const statusClass =
    statusMsg.type === "success"
      ? "param-status param-status-success"
      : statusMsg.type === "danger"
        ? "param-status param-status-danger"
        : "param-status param-status-neutral";

  return (
    <div className="testing-page-shell d-flex">
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Testing Mode" />

        <Container fluid className="py-4 testing-page-container">
          {statusMsg.text && (
            <Alert
              variant={statusMsg.type}
              dismissible
              className={`param-note ${
                statusMsg.type === "danger"
                  ? "param-note-danger"
                  : "param-note-warning"
              }`}
              onClose={() => setStatusMsg({ type: "", text: "" })}
            >
              <span className="param-note__title">{statusMsg.text}</span>
            </Alert>
          )}

          <section className="testing-page-section">
            <div className="param-header">
              <div className="param-header__content">
                <span className="param-header__eyebrow">Testing Controls</span>
                <h4 className="param-header__title">Environment / Parameters</h4>
                <div className="param-header__status">
                  <span className={statusClass}>
                    {sending
                      ? "Sending in progress"
                      : shutdownBusy
                        ? "Shutdown in progress"
                        : "Ready"}
                  </span>
                </div>
              </div>

              <div className="param-header__actions">
                <Button
                  className="param-btn param-btn-danger"
                  onClick={onSequentialShutdown}
                  disabled={shutdownBusy}
                >
                  {shutdownBusy ? "Sending..." : "Sequential Shutdown"}
                </Button>

                <Button
                  className="param-btn param-btn-primary"
                  onClick={() => onSendParams(batchInput)}
                  disabled={sending || !batchInput.trim() || isDuplicateBatch}
                >
                  {sending ? "Sending..." : "Send Parameters"}
                </Button>
              </div>
            </div>

            <Row className="g-3">
              <Col md={6} xl={3} style={{ position: "relative" }}>
                <InputField
                  label="Batch"
                  value={batchInput}
                  onChange={handleBatchInputChange}
                  accent="param-card-accent-primary"
                  helperText={
                    isDuplicateBatch
                      ? "This batch already exists."
                      : "Type to search existing batch records."
                  }
                />

                {filteredBatches.length > 0 && (
                  <ListGroup
                    className="mt-2 testing-batch-dropdown"
                    style={{
                      position: "absolute",
                      zIndex: 1000,
                      width: "100%",
                      maxHeight: "220px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredBatches.map((record, index) => (
                      <ListGroup.Item
                        key={index}
                        action
                        onClick={() => handleBatchSelect(record.batch)}
                      >
                        {record.batch}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Col>

              <Col md={6} xl={3}>
                <InputField
                  label="Ambient Temp"
                  type="number"
                  value={values.ambientTemp}
                  onChange={(e) => setField("ambientTemp")(e.target.value)}
                  accent="param-card-accent-success"
                />
              </Col>

              <Col md={6} xl={3}>
                <InputField
                  label="Ambient Humidity"
                  type="number"
                  value={values.ambientHum}
                  onChange={(e) => setField("ambientHum")(e.target.value)}
                  accent="param-card-accent-success"
                />
              </Col>

              <Col md={6} xl={3}>
                <InputField
                  label="Soil Moisture"
                  type="number"
                  value={values.soilMoisture}
                  onChange={(e) => setField("soilMoisture")(e.target.value)}
                  accent="param-card-accent-success"
                />
              </Col>

              <Col md={6} xl={3}>
                <InputField
                  label="Soil Temp"
                  type="number"
                  value={values.soilTemp}
                  onChange={(e) => setField("soilTemp")(e.target.value)}
                  accent="param-card-accent-success"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="UV Light"
                  value={values.paramUv}
                  onChange={setField("paramUv")}
                  accent="param-card-accent-primary"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="LED Light"
                  value={values.paramLed}
                  onChange={setField("paramLed")}
                  accent="param-card-accent-warning"
                />
              </Col>

              <Col md={6} xl={3}>
                <InputField
                  label="Duration (applies to all)"
                  type="number"
                  value={values.duration}
                  onChange={(e) => setField("duration")(e.target.value)}
                  accent="param-card-accent-primary"
                />
              </Col>
            </Row>
          </section>

          <section className="testing-page-section">
            <div className="param-header">
              <div className="param-header__content">
                <span className="param-header__eyebrow">Manual Override</span>
                <h4 className="param-header__title">Hardware Manual Controls</h4>
                <div className="param-header__status">
                  <span className="param-status param-status-neutral">
                    Direct ON / OFF control
                  </span>
                </div>
              </div>

              <div className="param-header__actions">
                <Button
                  className="param-btn param-btn-muted"
                  onClick={onSendHardware}
                  disabled={sending}
                >
                  {sending ? "Sending..." : "Send Hardware Command"}
                </Button>
              </div>
            </div>

            <Row className="g-3">
              <Col md={6} xl={3}>
                <ToggleCard
                  label="UV Light"
                  value={values.manualUv}
                  onChange={setField("manualUv")}
                  accent="param-card-accent-primary"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="LED Light"
                  value={values.manualLed}
                  onChange={setField("manualLed")}
                  accent="param-card-accent-warning"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="Peltier"
                  value={values.peltier}
                  onChange={setField("peltier")}
                  accent="param-card-accent-primary"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="Heater"
                  value={values.heater}
                  onChange={setField("heater")}
                  accent="param-card-accent-warning"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="Intake Fan"
                  value={values.intakeFan}
                  onChange={setField("intakeFan")}
                  accent="param-card-accent-success"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="Exhaust Fan"
                  value={values.exhaustFan}
                  onChange={setField("exhaustFan")}
                  accent="param-card-accent-success"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="Buzzer"
                  value={values.buzzer}
                  onChange={setField("buzzer")}
                  accent="param-card-accent-warning"
                />
              </Col>

              <Col md={6} xl={3}>
                <ToggleCard
                  label="Pump"
                  value={values.pump}
                  onChange={setField("pump")}
                  accent="param-card-accent-primary"
                />
              </Col>
            </Row>
          </section>
        </Container>
      </div>
    </div>
  );
}