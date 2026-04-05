import React from "react";
import {
  Card,
  Button,
  Form,
  InputGroup,
  Alert,
  Row,
  Col,
  Badge,
  Spinner,
} from "react-bootstrap";
import "./ParameterSection.css";

const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "--:--";
  const [hours, minutes] = timeStr.split(":");
  let h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

const formatMinutesToTime = (minutes, startTime = "00:00") => {
  if (!minutes) return "--";

  const [h, m] = startTime.split(":").map(Number);
  const startTotal = h * 60 + m;
  const endTotal = startTotal + Number(minutes);

  const endH = Math.floor((endTotal / 60) % 24);
  const endM = endTotal % 60;

  const ampm = endH >= 12 ? "PM" : "AM";
  const displayH = endH % 12 || 12;

  return `${displayH}:${endM.toString().padStart(2, "0")} ${ampm}`;
};

export function ParameterHeader({
  onReset,
  onSave,
  onSequentialShutdown,
  isLocked,
  checkingStatus,
  shutdownBusy,
}) {
  return (
    <div className="param-header">
      <div className="param-header__content">
        <span className="param-header__eyebrow">Control Center</span>
        <h3 className="param-header__title">System Configuration</h3>

        <div className="param-header__status">
          {checkingStatus ? (
            <span className="param-status param-status-neutral">
              <Spinner size="sm" animation="border" className="me-2" />
              Verifying status...
            </span>
          ) : isLocked ? (
            <span className="param-status param-status-danger">
              🔒 LOCKED: Batch pending germination detection.
            </span>
          ) : (
            <span className="param-status param-status-success">
              🔓 OPEN: Ready for optimization.
            </span>
          )}
        </div>
      </div>

      <div className="param-header__actions">
        <Button
          className="param-btn param-btn-danger"
          onClick={onSequentialShutdown}
          disabled={shutdownBusy}
          title="Turn OFF active actuators one by one every 3 seconds"
        >
          {shutdownBusy ? "Sending..." : "Sequential Shutdown"}
        </Button>

        <Button
          className="param-btn param-btn-muted"
          onClick={onReset}
          disabled={isLocked}
        >
          Reset
        </Button>

        <Button
          className="param-btn param-btn-primary"
          onClick={onSave}
          disabled={isLocked}
        >
          {isLocked ? "System Locked" : "Save & Sync"}
        </Button>
      </div>
    </div>
  );
}

export function ParameterField({
  label,
  value,
  onChange,
  unit,
  isLocked,
  min,
  max,
  step = "0.01",
  rangeText,
}) {
  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^-?\d*\.?\d{0,2}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Card className={`param-card h-100 ${isLocked ? "is-locked" : ""}`}>
      <Card.Body className="param-card__body">
        <div className="param-card__label-wrap">
          <div className="param-card__label">{label}</div>
          {rangeText && <div className="param-card__range">{rangeText}</div>}
        </div>

        <InputGroup className="param-input-group">
          <Form.Control
            type="number"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            disabled={isLocked}
            min={min}
            max={max}
            step={step}
            className="param-input"
          />
          <InputGroup.Text className="param-input-addon">
            {unit}
          </InputGroup.Text>
        </InputGroup>
      </Card.Body>
    </Card>
  );
}

export function ParameterGrid({
  values,
  setField,
  isLocked,
  existingBatches = [],
  latestBatch = null,
  newBatchBlocked = false,
  selectedBatchExists = false,
}) {
  const latestBatchId =
    latestBatch?.actual_batch ||
    latestBatch?.batch_name ||
    latestBatch?.batch_id ||
    "";

  const latestIncomplete = latestBatch && !latestBatch.actual_germination_date;

  return (
    <Row className="g-3">
      <Col md={6} xl={4}>
        <Card className="param-card param-card-accent-success h-100">
          <Card.Body className="param-card__body">
            <div className="param-card__label param-card__label-success">
              Active Batch
            </div>

            <Form.Group>
              <Form.Label className="param-field-label">
                Batch ID / Name
              </Form.Label>

              <Form.Control
                type="text"
                list="batchList"
                value={values.batch}
                onChange={(e) => setField("batch")(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Type or select batch..."
                className="param-input-single"
              />

              <datalist id="batchList">
                {existingBatches.map((b) => {
                  const batchValue = b.actual_batch || b.batch_name || b.batch_id;
                  const isDone = !!b.actual_germination_date;

                  return (
                    <option
                      key={b.id}
                      value={batchValue}
                      label={`${batchValue} ${isDone ? "- Completed" : "- In Progress"}`}
                    />
                  );
                })}
              </datalist>

              <small className="param-helper-text">
                Select any existing batch to view it in read-only mode.
              </small>

              {selectedBatchExists && (
                <small className="param-helper-text param-helper-text-danger">
                  Existing batch selected. Editing is disabled to preserve saved
                  data.
                </small>
              )}

              {newBatchBlocked && latestIncomplete && (
                <small className="param-helper-text param-helper-text-danger">
                  New batch creation is blocked until latest batch (
                  {latestBatchId}) is completed.
                </small>
              )}
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Ambient Temp"
          value={values.ambientTemp}
          onChange={setField("ambientTemp")}
          unit="°C"
          isLocked={isLocked}
          min={20}
          max={30}
          step="0.01"
          rangeText="Allowed range: 20–30 °C"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Humidity"
          value={values.ambientHum}
          onChange={setField("ambientHum")}
          unit="%"
          isLocked={isLocked}
          min={60}
          max={70}
          step="0.01"
          rangeText="Allowed range: 60–70 %"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Soil Moisture"
          value={values.soilMoisture}
          onChange={setField("soilMoisture")}
          unit="%"
          isLocked={isLocked}
          min={45}
          max={70}
          step="0.01"
          rangeText="Allowed range: 45–70 %"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Soil Temp"
          value={values.soilTemp}
          onChange={setField("soilTemp")}
          unit="°C"
          isLocked={isLocked}
          min={20}
          max={23}
          step="0.01"
          rangeText="Allowed range: 20–23 °C"
        />
      </Col>

      <Col md={6} xl={4}>
        <Card
          className={`param-card param-card-accent-primary h-100 ${
            isLocked ? "is-locked" : ""
          }`}
        >
          <Card.Body className="param-card__body">
            <div className="param-schedule-head">
              <div className="param-card__label param-card__label-primary">
                UV Light
              </div>

              <div className="param-badge-stack">
                <Badge className="param-badge">
                  {formatTo12Hour(values.uvStart)}
                </Badge>
                <Badge className="param-badge">
                  Ends at: {formatMinutesToTime(values.uvDuration, values.uvStart)}
                </Badge>
              </div>
            </div>

            <Form.Group className="mb-2">
              <Form.Control
                type="time"
                value={values.uvStart}
                onChange={(e) => setField("uvStart")(e.target.value)}
                disabled={isLocked}
                className="param-input-single"
              />
            </Form.Group>

            <Form.Group>
              <Form.Control
                type="number"
                value={values.uvDuration}
                onChange={(e) => setField("uvDuration")(e.target.value)}
                disabled={isLocked}
                placeholder="Mins"
                className="param-input-single"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} xl={4}>
        <Card
          className={`param-card param-card-accent-warning h-100 ${
            isLocked ? "is-locked" : ""
          }`}
        >
          <Card.Body className="param-card__body">
            <div className="param-schedule-head">
              <div className="param-card__label param-card__label-warning">
                LED Light
              </div>

              <div className="param-badge-stack">
                <Badge className="param-badge">
                  {formatTo12Hour(values.ledStart)}
                </Badge>
                <Badge className="param-badge">
                  Ends at: {formatMinutesToTime(
                    values.ledDuration,
                    values.ledStart
                  )}
                </Badge>
              </div>
            </div>

            <Form.Group className="mb-2">
              <Form.Control
                type="time"
                value={values.ledStart}
                onChange={(e) => setField("ledStart")(e.target.value)}
                disabled={isLocked}
                className="param-input-single"
              />
            </Form.Group>

            <Form.Group>
              <Form.Control
                type="number"
                value={values.ledDuration}
                onChange={(e) => setField("ledDuration")(e.target.value)}
                disabled={isLocked}
                placeholder="Mins"
                className="param-input-single"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export function ParameterNote({ isLocked }) {
  return (
    <Alert
      className={`param-note mt-4 mb-0 ${
        isLocked ? "param-note-danger" : "param-note-warning"
      }`}
    >
      <span className="param-note__title">
        {isLocked ? "READ-ONLY MODE:" : "NOTE:"}
      </span>{" "}
      {isLocked
        ? "This batch configuration is archived or active. Parameters are locked to preserve experimental integrity."
        : "Optimization Layer is active. Any changes saved will be pushed to the Raspberry Pi 5 control system immediately."}
    </Alert>
  );
}