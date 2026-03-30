import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Container, Card, Spinner, Alert } from "react-bootstrap";
import axios from "axios";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { ParameterHeader, ParameterGrid, ParameterNote } from "./ParameterComponents";

export default function ParametersPage() {
  const initialValues = useMemo(() => ({
    batch: "BATCH-001",
    ambientTemp: 20, ambientHum: 50, soilMoisture: 60, soilTemp: 25,
    uvStart: "07:00", uvDuration: 90, ledStart: "18:00", ledDuration: 90
  }), []);

  const [values, setValues] = useState(initialValues);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [shutdownBusy, setShutdownBusy] = useState(false);

  // Inside ParametersPage component
  const verifyLockStatus = useCallback(async (batchId) => {
    if (!batchId) return;
    setCheckingStatus(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:8000/api/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setIsLocked(true); 
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      // If 404 error, the batch doesn't exist yet, so we keep it unlocked for new entry
      setIsLocked(false);
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  const loadBatchConfig = useCallback(async (batchId) => {
    if (!batchId) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:8000/api/configurations/batch/${encodeURIComponent(batchId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setValues({
          batch: res.data.batch ?? batchId,
          ambientTemp: res.data.ambientTemp ?? 25.0,
          ambientHum: res.data.ambientHum ?? 70.0,
          soilMoisture: res.data.soilMoisture ?? 35.0,
          soilTemp: res.data.soilTemp ?? 22.0,
          uvStart: res.data.uvStart ?? "07:00",
          uvDuration: res.data.uvDuration ?? 90,
          ledStart: res.data.ledStart ?? "18:00",
          ledDuration: res.data.ledDuration ?? 360,
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setValues(prev => ({ ...prev, batch: batchId }));
      } else {
        console.error(err);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");

        const configResp = await axios.get("http://localhost:8000/api/configurations/active", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (configResp.data) setValues(configResp.data);

        const batchResp = await axios.get("http://localhost:8000/api/batches", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBatches(batchResp.data);

        if (configResp.data) await verifyLockStatus(configResp.data.batch);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [verifyLockStatus]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await loadBatchConfig(values.batch);
      await verifyLockStatus(values.batch);
    }, 600);

    return () => clearTimeout(timer);
  }, [values.batch, loadBatchConfig, verifyLockStatus]);

  const setField = (key) => (val) => setValues(prev => ({ ...prev, [key]: val }));

  const onReset = () => {
    setValues(initialValues);
    setStatusMsg({ type: '', text: '' });
  };

  const onSave = async () => {
    if (isLocked) return;
    const token = localStorage.getItem("token");

    try {
      setStatusMsg({ type: 'info', text: 'AI is calculating germination timeline...' });

      // 1. Start the timer immediately before the ML call
      const startTime = performance.now();

      // 2. Get the prediction
      const mlRes = await axios.post("http://localhost:5000/api/predict", values);
      const aiPrediction = mlRes.data.predicted_days;

      // 3. Calculate the difference
      const endTime = performance.now();
      const calculatedLatency = Math.round(endTime - startTime);

      // 4. SEND TO LARAVEL (Check the key 'latency_ms' here)
      await axios.post("http://localhost:8000/api/batches", {
        batch_id: values.batch,
        date_planted: new Date().toISOString().split('T')[0],
        predicted_days: aiPrediction,
        latency_ms: calculatedLatency
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 5. Save the rest of the config
      await axios.post("http://localhost:8000/api/configurations", {
        batch: values.batch,
        ambientTemp: Number(values.ambientTemp),
        ambientHum: Number(values.ambientHum),
        soilMoisture: Number(values.soilMoisture),
        soilTemp: Number(values.soilTemp),
        uvStart: values.uvStart,
        uvDuration: Number(values.uvDuration),
        ledStart: values.ledStart,
        ledDuration: Number(values.ledDuration)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await axios.post("http://localhost:5000/api/update_params", values);

      setStatusMsg({ 
        type: 'success', 
        text: `Optimized. Prediction: ${aiPrediction} days. Latency: ${calculatedLatency}ms.` 
      });
      
      verifyLockStatus(values.batch);
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: 'danger', text: 'Integration Error. Check server connections.' });
    }
  };

  const onSequentialShutdown = async () => {
    try {
      setShutdownBusy(true);
      setStatusMsg({ type: 'info', text: 'Sequential actuator shutdown command sent...' });

      await axios.post("http://localhost:5000/api/sequential_shutdown");

      setStatusMsg({
        type: 'warning',
        text: 'Sequential actuator shutdown started. Active actuators will turn off one by one every 3 seconds.'
      });
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: 'danger',
        text: 'Failed to send sequential shutdown command.'
      });
    } finally {
      setShutdownBusy(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
      <Spinner animation="border" variant="success" />
    </div>
  );

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />
      <div className="flex-grow-1">
        <DashboardHeader title="Environment Control" />
        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          {statusMsg.text && (
            <Alert
              variant={statusMsg.type}
              dismissible
              onClose={() => setStatusMsg({ type: '', text: '' })}
            >
              {statusMsg.text}
            </Alert>
          )}

          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <ParameterHeader
                onReset={onReset}
                onSave={onSave}
                onSequentialShutdown={onSequentialShutdown}
                isLocked={isLocked}
                checkingStatus={checkingStatus}
                shutdownBusy={shutdownBusy}
              />

              <ParameterGrid
                values={values}
                setField={setField}
                isLocked={isLocked}
                existingBatches={batches}
              />

              <ParameterNote isLocked={isLocked} />
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}