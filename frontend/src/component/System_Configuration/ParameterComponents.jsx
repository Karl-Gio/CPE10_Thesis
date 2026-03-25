import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Alert from "react-bootstrap/Alert";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

/* Header inside the big card (title + actions) */
export function ParameterHeader({ onReset, onSave }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h3 className="fw-bold mb-0">Parameter Configuration</h3>

      <div className="d-flex gap-2">
        <Button variant="outline-secondary" className="px-4" onClick={onReset}>
          Reset
        </Button>
        <Button variant="dark" className="px-4" onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

/* One parameter card */
export function ParameterField({ label, value, onChange, unit }) {
  const handleChange = (e) => {
    const val = e.target.value;
    // Regex allows empty string, or numbers with optional negative sign and up to 2 decimal places
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
            className="py-2"
          />
          <InputGroup.Text className="bg-white text-muted fw-semibold">
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
      {/* 0. Current Batch */}
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-success border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-success fw-bold mb-2">Current Batch</div>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Batch Name</Form.Label>
              <Form.Control
                type="text"
                value={values.batch}
                onChange={(e) => setField("batch")(e.target.value)}
                placeholder="e.g. Batch A"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      {/* 1. Ambient Temperature */}
      <Col md={6} xl={4}>
        <ParameterField
          label="Ambient Temperature"
          value={values.ambientTemp}
          onChange={setField("ambientTemp")}
          unit="°C"
        />
      </Col>

      {/* 2. Ambient Humidity */}
      <Col md={6} xl={4}>
        <ParameterField
          label="Ambient Humidity"
          value={values.ambientHum}
          onChange={setField("ambientHum")}
          unit="%"
        />
      </Col>

      {/* 3. Soil Moisture */}
      <Col md={6} xl={4}>
        <ParameterField
          label="Soil Moisture"
          value={values.soilMoisture}
          onChange={setField("soilMoisture")}
          unit="%"
        />
      </Col>

      {/* 4. Soil Temperature */}
      <Col md={6} xl={4}>
        <ParameterField
          label="Soil Temperature"
          value={values.soilTemp}
          onChange={setField("soilTemp")}
          unit="°C"
        />
      </Col>

      {/* 5. UV LIGHT CONFIGURATION */}
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-primary border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-primary fw-bold mb-2">UV Light Schedule</div>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-0">Start Time</Form.Label>
              <Form.Control
                type="time"
                value={values.uvStart}
                onChange={(e) => setField("uvStart")(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Duration (Minutes)</Form.Label>
              <Form.Control
                type="number"
                value={values.uvDuration}
                onChange={(e) => setField("uvDuration")(e.target.value)}
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      {/* 6. LED LIGHT CONFIGURATION */}
      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-warning border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-warning fw-bold mb-2">LED Light Schedule</div>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-0">Start Time</Form.Label>
              <Form.Control
                type="time"
                value={values.ledStart}
                onChange={(e) => setField("ledStart")(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label className="small text-muted mb-0">Duration (Minutes)</Form.Label>
              <Form.Control
                type="number"
                value={values.ledDuration}
                onChange={(e) => setField("ledDuration")(e.target.value)}
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

/* Note box at the bottom */
export function ParameterNote() {
  return (
    <Alert
      variant="warning"
      className="mt-4 mb-0 rounded-4"
      style={{ background: "rgba(255,193,7,0.12)" }}
    >
      <span className="fw-semibold">Note:</span> Modifying these parameters will
      directly affect the automated control systems. Ensure values are within the
      safe threshold for <em>Brassica rapa</em>.
    </Alert>
  );
}