import React from "react";
import { Card, Button, Form, InputGroup, Alert, Row, Col, Badge, Spinner } from "react-bootstrap";

const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "--:--";
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
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
  shutdownBusy
}) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
      <div>
        <h3 className="fw-bold mb-0">System Configuration</h3>
        {checkingStatus ? (
          <small className="text-muted">
            <Spinner size="sm" animation="border" className="me-1" />
            Verifying status...
          </small>
        ) : isLocked ? (
          <small className="text-danger fw-bold">🔒 LOCKED: Batch pending germination detection.</small>
        ) : (
          <small className="text-success fw-bold">🔓 OPEN: Ready for optimization.</small>
        )}
      </div>

      <div className="d-flex gap-2 flex-wrap align-items-center">
        <Button
          variant="outline-danger"
          className="px-4 rounded-pill"
          onClick={onSequentialShutdown}
          disabled={shutdownBusy}
          title="Turn OFF active actuators one by one every 3 seconds"
        >
          {shutdownBusy ? "Sending..." : "Sequential Shutdown"}
        </Button>

        <Button
          variant="outline-secondary"
          className="px-4 rounded-pill"
          onClick={onReset}
          disabled={isLocked}
        >
          Reset
        </Button>

        <Button
          variant="dark"
          className="px-4 rounded-pill shadow-sm"
          onClick={onSave}
          disabled={isLocked}
        >
          {isLocked ? "System Locked" : "Save & Sync"}
        </Button>
      </div>
    </div>
  );
}

export function ParameterField({ label, value, onChange, unit, isLocked }) {
  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^-?\d*\.?\d{0,2}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Card className={`shadow-sm border-0 rounded-4 h-100 ${isLocked ? 'bg-light opacity-75' : ''}`}>
      <Card.Body className="p-3">
        <div className="text-uppercase small text-muted fw-bold mb-2">{label}</div>
        <InputGroup>
          <Form.Control
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            disabled={isLocked}
            className="py-2 border-end-0 bg-white"
          />
          <InputGroup.Text className="bg-white text-muted fw-semibold border-start-0">
            {unit}
          </InputGroup.Text>
        </InputGroup>
      </Card.Body>
    </Card>
  );
}

export function ParameterGrid({ values, setField, isLocked, existingBatches = [] }) {
  return (
    <Row className="g-3">
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-success border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-success fw-bold mb-2">Active Batch</div>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Batch ID / Name</Form.Label>
              <Form.Control
                type="text"
                list="batchList"
                value={values.batch}
                onChange={(e) => setField("batch")(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Type or select batch..."
              />
              <datalist id="batchList">
                {existingBatches.map((b) => (
                  <option
                    key={b.id}
                    value={b.actual_batch || b.batch_name || b.batch_id}
                    label={`${b.actual_batch || b.batch_name || b.batch_id} ${
                      b.actual_germination_date ? "- Completed" : "- In Progress"
                    }`}
                  />
                ))}
              </datalist>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                Pick existing to view or type new ID to start.
              </small>
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
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Humidity"
          value={values.ambientHum}
          onChange={setField("ambientHum")}
          unit="%"
          isLocked={isLocked}
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Soil Moisture"
          value={values.soilMoisture}
          onChange={setField("soilMoisture")}
          unit="%"
          isLocked={isLocked}
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Target Soil Temp"
          value={values.soilTemp}
          onChange={setField("soilTemp")}
          unit="°C"
          isLocked={isLocked}
        />
      </Col>

      <Col md={6} xl={4}>
        <Card className={`shadow-sm border-0 rounded-4 h-100 border-start border-primary border-4 ${isLocked ? 'bg-light opacity-75' : ''}`}>
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-uppercase small text-primary fw-bold">UV Light</div>
              <Badge bg="primary-subtle" className="text-primary border border-primary-subtle">
                {formatTo12Hour(values.uvStart)}
              </Badge>
              <Badge bg="info">
                Ends at: {formatMinutesToTime(values.uvDuration, values.uvStart)}
              </Badge>
            </div>
            <Form.Group className="mb-2">
              <Form.Control
                type="time"
                value={values.uvStart}
                onChange={(e) => setField("uvStart")(e.target.value)}
                disabled={isLocked}
              />
            </Form.Group>
            <Form.Group>
              <Form.Control
                type="number"
                value={values.uvDuration}
                onChange={(e) => setField("uvDuration")(e.target.value)}
                disabled={isLocked}
                placeholder="Mins"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} xl={4}>
        <Card className={`shadow-sm border-0 rounded-4 h-100 border-start border-warning border-4 ${isLocked ? 'bg-light opacity-75' : ''}`}>
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-uppercase small text-warning fw-bold">LED Light</div>
              <Badge bg="warning-subtle" className="text-warning border border-warning-subtle">
                {formatTo12Hour(values.ledStart)}
              </Badge>
              <Badge bg="info">
                Ends at: {formatMinutesToTime(values.ledDuration, values.ledStart)}
              </Badge>
            </div>
            <Form.Group className="mb-2">
              <Form.Control
                type="time"
                value={values.ledStart}
                onChange={(e) => setField("ledStart")(e.target.value)}
                disabled={isLocked}
              />
            </Form.Group>
            <Form.Group>
              <Form.Control
                type="number"
                value={values.ledDuration}
                onChange={(e) => setField("ledDuration")(e.target.value)}
                disabled={isLocked}
                placeholder="Mins"
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
    <Alert variant={isLocked ? "danger" : "warning"} className="mt-4 mb-0 rounded-4 border-0 shadow-sm">
      <span className="fw-bold">{isLocked ? "READ-ONLY MODE:" : "NOTE:"}</span>{" "}
      {isLocked
        ? "This batch configuration is archived or active. Parameters are locked to preserve experimental integrity."
        : "Optimization Layer is active. Any changes saved will be pushed to the Raspberry Pi 5 control system immediately."}
    </Alert>
  );
}