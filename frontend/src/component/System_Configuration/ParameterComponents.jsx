import React from "react";
import { Card, Button, Form, InputGroup, Alert, Row, Col, Badge } from "react-bootstrap";

/** * Helper: Converts "18:00" to "6:00 PM" 
 * Used for visual feedback only.
 */
const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "--:--";
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

export function ParameterHeader({ onReset, onSave }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h3 className="fw-bold mb-0">System Configuration</h3>
      <div className="d-flex gap-2">
        <Button variant="outline-secondary" className="px-4 rounded-pill" onClick={onReset}>
          Reset
        </Button>
        <Button variant="dark" className="px-4 rounded-pill" onClick={onSave}>
          Save & Sync
        </Button>
      </div>
    </div>
  );
}

export function ParameterField({ label, value, onChange, unit }) {
  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^-?\d*\.?\d{0,2}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Card className="shadow-sm border-0 rounded-4 h-100">
      <Card.Body className="p-3">
        <div className="text-uppercase small text-muted fw-bold mb-2">{label}</div>
        <InputGroup>
          <Form.Control
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            className="py-2 border-end-0"
          />
          <InputGroup.Text className="bg-white text-muted fw-semibold border-start-0">
            {unit}
          </InputGroup.Text>
        </InputGroup>
      </Card.Body>
    </Card>
  );
}

export function ParameterGrid({ values, setField }) {
  return (
    <Row className="g-3">
      {/* Current Batch Selection */}
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-success border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-success fw-bold mb-2">Active Batch</div>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Batch ID / Name</Form.Label>
              <Form.Control
                type="text"
                value={values.batch}
                onChange={(e) => setField("batch")(e.target.value)}
                placeholder="e.g. B-2026-001"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      {/* Target Sensors */}
      <Col md={6} xl={4}><ParameterField label="Target Ambient Temp" value={values.ambientTemp} onChange={setField("ambientTemp")} unit="°C" /></Col>
      <Col md={6} xl={4}><ParameterField label="Target Humidity" value={values.ambientHum} onChange={setField("ambientHum")} unit="%" /></Col>
      <Col md={6} xl={4}><ParameterField label="Target Soil Moisture" value={values.soilMoisture} onChange={setField("soilMoisture")} unit="%" /></Col>
      <Col md={6} xl={4}><ParameterField label="Target Soil Temp" value={values.soilTemp} onChange={setField("soilTemp")} unit="°C" /></Col>

      {/* UV Schedule */}
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-primary border-4">
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="text-uppercase small text-primary fw-bold">UV Light</div>
                <Badge bg="primary-subtle" className="text-primary border border-primary-subtle">
                    {formatTo12Hour(values.uvStart)}
                </Badge>
            </div>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-0">Start Time</Form.Label>
              <Form.Control type="time" value={values.uvStart} onChange={(e) => setField("uvStart")(e.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Duration (Mins)</Form.Label>
              <Form.Control type="number" value={values.uvDuration} onChange={(e) => setField("uvDuration")(e.target.value)} />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      {/* LED Schedule */}
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-warning border-4">
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="text-uppercase small text-warning fw-bold">LED Light</div>
                <Badge bg="warning-subtle" className="text-warning border border-warning-subtle">
                    {formatTo12Hour(values.ledStart)}
                </Badge>
            </div>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-0">Start Time</Form.Label>
              <Form.Control type="time" value={values.ledStart} onChange={(e) => setField("ledStart")(e.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Duration (Mins)</Form.Label>
              <Form.Control type="number" value={values.ledDuration} onChange={(e) => setField("ledDuration")(e.target.value)} />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export function ParameterNote() {
  return (
    <Alert variant="warning" className="mt-4 mb-0 rounded-4 border-0 shadow-sm" style={{ background: "rgba(255,193,7,0.1)" }}>
      <span className="fw-semibold">Thesis Note:</span> These parameters represent the <strong>Optimization Layer</strong>. Changes will be pushed to the RPi5 and saved as a new experimental configuration in the database.
    </Alert>
  );
}