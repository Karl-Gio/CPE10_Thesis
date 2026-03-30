import React, { useMemo, useState, useEffect } from "react";
import {
  Container,
  Card,
  Spinner,
  Alert,
  Button,
  Row,
  Col,
  Form,
} from "react-bootstrap";
import axios from "axios";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

function TestingHeader({ onReset, onSend, sending }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
      <div>
        <h3 className="fw-bold mb-0">Testing Mode</h3>
        <small className="text-primary fw-bold">
          ⚙️ Changes here directly control the system without saving to database.
        </small>
      </div>

      <div className="d-flex gap-2 flex-wrap align-items-center">
        <Button
          variant="outline-secondary"
          className="px-4 rounded-pill"
          onClick={onReset}
          disabled={sending}
        >
          Reset
        </Button>

        <Button
          variant="dark"
          className="px-4 rounded-pill shadow-sm"
          onClick={onSend}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send to System"}
        </Button>
      </div>
    </div>
  );
}

function TestingNote({ commandPreview }) {
  return (
    <Alert variant="info" className="mt-4 mb-0 rounded-4 border-0 shadow-sm">
      <div className="fw-bold mb-1">TESTING MODE:</div>
      <div className="mb-2">
        These values are not saved. They are only sent to the Python controller
        and Arduino in real-time.
      </div>
      <div>
        <span className="fw-semibold">Command Preview:</span>{" "}
        <code>{commandPreview}</code>
      </div>
    </Alert>
  );
}

function TestingField({ label, value, onChange, unit }) {
  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^-?\d*\.?\d{0,2}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Card className="shadow-sm border-0 rounded-4 h-100">
      <Card.Body className="p-3">
        <div className="text-uppercase small text-muted fw-bold mb-2">
          {label}
        </div>
        <div className="input-group">
          <Form.Control
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
          />
          <span className="input-group-text">{unit}</span>
        </div>
      </Card.Body>
    </Card>
  );
}

function TestingGrid({ values, setField }) {
  return (
    <Row className="g-3">
      <Col md={6} xl={4}>
        <TestingField
          label="Ambient Temp"
          value={values.ambientTemp}
          onChange={setField("ambientTemp")}
          unit="°C"
        />
      </Col>

      <Col md={6} xl={4}>
        <TestingField
          label="Ambient Humidity"
          value={values.ambientHum}
          onChange={setField("ambientHum")}
          unit="%"
        />
      </Col>

      <Col md={6} xl={4}>
        <TestingField
          label="Soil Moisture"
          value={values.soilMoisture}
          onChange={setField("soilMoisture")}
          unit="%"
        />
      </Col>

      <Col md={6} xl={4}>
        <TestingField
          label="Soil Temp"
          value={values.soilTemp}
          onChange={setField("soilTemp")}
          unit="°C"
        />
      </Col>

      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-primary border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-primary fw-bold mb-2">
              UV Light
            </div>
            <Form.Select
              value={values.uv}
              onChange={(e) => setField("uv")(Number(e.target.value))}
            >
              <option value={0}>OFF</option>
              <option value={1}>ON</option>
            </Form.Select>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} xl={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100 border-start border-warning border-4">
          <Card.Body className="p-3">
            <div className="text-uppercase small text-warning fw-bold mb-2">
              LED Light
            </div>
            <Form.Select
              value={values.led}
              onChange={(e) => setField("led")(Number(e.target.value))}
            >
              <option value={0}>OFF</option>
              <option value={1}>ON</option>
            </Form.Select>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default function TestingPage() {
  const initialValues = useMemo(
    () => ({
      ambientTemp: 20,
      ambientHum: 50,
      soilMoisture: 60,
      soilTemp: 25,
      uv: 0,
      led: 0,
    }),
    []
  );

  const [values, setValues] = useState(initialValues);
  const [baselineValues, setBaselineValues] = useState(initialValues);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const setField = (key) => (val) =>
    setValues((prev) => ({
      ...prev,
      [key]: val,
    }));

  const buildCommand = () => {
    const ambientTemp = Number(values.ambientTemp || 0);
    const ambientHum = Number(values.ambientHum || 0);
    const soilMoisture = Number(values.soilMoisture || 0);
    const soilTemp = Number(values.soilTemp || 0);
    const uv = Number(values.uv || 0);
    const led = Number(values.led || 0);

    return `<${ambientTemp},${ambientHum},${soilMoisture},${soilTemp},${uv},${led}>`;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");

        const configResp = await axios.get(
          "http://localhost:8000/api/configurations/active",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const active = configResp.data
          ? {
              ambientTemp: configResp.data.ambientTemp ?? 20,
              ambientHum: configResp.data.ambientHum ?? 50,
              soilMoisture: configResp.data.soilMoisture ?? 60,
              soilTemp: configResp.data.soilTemp ?? 25,
              uv: 0,
              led: 0,
            }
          : initialValues;

        setBaselineValues(active);
        setValues(active);
      } catch (error) {
        console.error(error);
        setStatusMsg({
          type: "danger",
          text: "Failed to load baseline values.",
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [initialValues]);

  const onReset = () => {
    setValues(baselineValues);
    setStatusMsg({ type: "", text: "" });
  };

  const onSend = async () => {
    try {
      setSending(true);

      // build ONCE
      const command = buildCommand();

      // show EXACT same command
      setStatusMsg({
        type: "info",
        text: `Sending command: ${command}`,
      });

      await axios.post("http://localhost:5000/api/testing_command", {
        command
      });

      // use SAME command again
      setStatusMsg({
        type: "success",
        text: `Command sent successfully: ${command}`,
      });

    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "danger",
        text: "Failed to send command.",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Testing Mode" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          {statusMsg.text && (
            <Alert
              variant={statusMsg.type}
              dismissible
              onClose={() => setStatusMsg({ type: "", text: "" })}
            >
              {statusMsg.text}
            </Alert>
          )}

          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <TestingHeader
                onReset={onReset}
                onSend={onSend}
                sending={sending}
              />

              <TestingGrid values={values} setField={setField} />

              <TestingNote commandPreview={buildCommand()} />
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}