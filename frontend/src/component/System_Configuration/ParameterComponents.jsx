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
export function ParameterField({ label, value, onChange, unit, step = "0.01" }) {
  return (
    <Card className="shadow-sm border-0 rounded-4 h-100">
      <Card.Body className="p-3">
        <div className="text-uppercase small text-muted fw-bold mb-2">{label}</div>

        <InputGroup>
          <Form.Control
            type="number"
            value={value}
            step={step}
            onChange={(e) => onChange(e.target.value)}
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

/* Grid of all parameter cards */
export function ParameterGrid({ values, setField }) {
  return (
    <Row className="g-3">
      <Col md={6} xl={4}>
        <ParameterField
          label="Ambient Temperature"
          value={values.ambientTemp}
          onChange={setField("ambientTemp")}
          unit="°C"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Ambient Humidity"
          value={values.ambientHum}
          onChange={setField("ambientHum")}
          unit="%"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Light Intensity"
          value={values.lightIntensity}
          onChange={setField("lightIntensity")}
          unit="lux"
          step="0.1"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Soil Moisture"
          value={values.soilMoisture}
          onChange={setField("soilMoisture")}
          unit="%"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Soil Humidity"
          value={values.soilHumidity}
          onChange={setField("soilHumidity")}
          unit="%"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Soil Temperature"
          value={values.soilTemp}
          onChange={setField("soilTemp")}
          unit="°C"
        />
      </Col>

      <Col md={6} xl={4}>
        <ParameterField
          label="Soil pH"
          value={values.soilPh}
          onChange={setField("soilPh")}
          unit="pH"
          step="0.1"
        />
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
