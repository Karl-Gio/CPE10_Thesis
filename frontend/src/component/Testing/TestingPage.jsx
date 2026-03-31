import React from "react";
import { Container, Card, Alert, Button, Row, Col, Form } from "react-bootstrap";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { useTestingLogic } from "./useTestingLogic";

// Reusable Sub-Components
const InputField = ({ label, value, onChange, type = "text" }) => (
  <Card className="shadow-sm border-0 rounded-4 h-100">
    <Card.Body className="p-3">
      <div className="text-uppercase small text-muted fw-bold mb-2">{label}</div>
      <Form.Control type={type} value={value} onChange={onChange} />
    </Card.Body>
  </Card>
);

const ToggleCard = ({ label, value, onChange, color = "primary" }) => (
  <Card className={`shadow-sm border-0 rounded-4 h-100 border-start border-${color} border-4`}>
    <Card.Body className="p-3">
      <div className={`text-uppercase small text-${color} fw-bold mb-2`}>{label}</div>
      <Form.Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        <option value={0}>OFF</option>
        <option value={1}>ON</option>
      </Form.Select>
    </Card.Body>
  </Card>
);

export default function TestingPage() {
  const {
    values, sending, statusMsg, setStatusMsg, 
    setField, command, onSendParams, onSendHardware 
  } = useTestingLogic();

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />
      <div className="flex-grow-1">
        <DashboardHeader title="Testing Mode" />

        <Container fluid className="py-4" style={{ maxWidth: "1250px" }}>
          {statusMsg.text && (
            <Alert variant={statusMsg.type} dismissible onClose={() => setStatusMsg({ type: "", text: "" })}>
              {statusMsg.text}
            </Alert>
          )}

          {/* SECTION 1 - ENVIRONMENT SETTINGS */}
          <Card className="shadow-sm border-0 rounded-4 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="fw-bold mb-1">Environment / Parameters</h4>
                  <small className="text-muted">Input values for batch and environmental setup.</small>
                </div>
                <Button variant="success" className="px-4 rounded-pill" onClick={onSendParams} disabled={sending}>
                  {sending ? "Sending..." : "Send Parameters"}
                </Button>
              </div>

              <Row className="g-3">
                <Col md={6} xl={3}><InputField label="Batch" value={values.batch} onChange={(e) => setField("batch")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="Ambient Temp" type="number" value={values.ambientTemp} onChange={(e) => setField("ambientTemp")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="Ambient Humidity" type="number" value={values.ambientHum} onChange={(e) => setField("ambientHum")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="Soil Moisture" type="number" value={values.soilMoisture} onChange={(e) => setField("soilMoisture")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="Soil Temp" type="number" value={values.soilTemp} onChange={(e) => setField("soilTemp")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="UV Start" type="time" value={values.uvStart} onChange={(e) => setField("uvStart")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="UV Duration" type="number" value={values.uvDuration} onChange={(e) => setField("uvDuration")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="LED Start" type="time" value={values.ledStart} onChange={(e) => setField("ledStart")(e.target.value)} /></Col>
                <Col md={6} xl={3}><InputField label="LED Duration" type="number" value={values.ledDuration} onChange={(e) => setField("ledDuration")(e.target.value)} /></Col>
              </Row>
            </Card.Body>
          </Card>

          {/* SECTION 2 - HARDWARE CONTROLS */}
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="fw-bold mb-1">Hardware Manual Controls</h4>
                  <small className="text-muted">Turn components ON/OFF directly.</small>
                </div>
                <Button variant="dark" className="px-4 rounded-pill" onClick={onSendHardware} disabled={sending}>
                  {sending ? "Sending..." : "Send Hardware Command"}
                </Button>
              </div>

              <Row className="g-3">
                <Col md={6} xl={3}><ToggleCard label="UV Light" value={values.uv} onChange={setField("uv")} color="primary" /></Col>
                <Col md={6} xl={3}><ToggleCard label="LED Light" value={values.led} onChange={setField("led")} color="warning" /></Col>
                <Col md={6} xl={3}><ToggleCard label="Peltier" value={values.peltier} onChange={setField("peltier")} color="info" /></Col>
                <Col md={6} xl={3}><ToggleCard label="Heater" value={values.heater} onChange={setField("heater")} color="danger" /></Col>
                <Col md={6} xl={3}><ToggleCard label="Intake Fan" value={values.intakeFan} onChange={setField("intakeFan")} color="success" /></Col>
                <Col md={6} xl={3}><ToggleCard label="Exhaust Fan" value={values.exhaustFan} onChange={setField("exhaustFan")} color="secondary" /></Col>
                <Col md={6} xl={3}><ToggleCard label="Buzzer" value={values.buzzer} onChange={setField("buzzer")} color="dark" /></Col>
                <Col md={6} xl={3}><ToggleCard label="Pump" value={values.pump} onChange={setField("pump")} color="primary" /></Col>
              </Row>

              <Alert variant="info" className="mt-4 mb-0 rounded-4 border-0 shadow-sm">
                <div className="fw-bold mb-1">Command Preview</div>
                <code>{command}</code>
              </Alert>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}