import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Container, Card, Spinner, Alert } from "react-bootstrap";
import axios from "axios";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { ParameterHeader, ParameterGrid, ParameterNote } from "./ParameterComponents";

export default function ParametersPage() {
  const initialValues = useMemo(() => ({
    batch: "B-2026-001",
    ambientTemp: 25.0, ambientHum: 70.0, soilMoisture: 35.0, soilTemp: 22.0,
    uvStart: "07:00", uvDuration: 90, ledStart: "18:00", ledDuration: 360
  }), []);

  const [values, setValues] = useState(initialValues);
  const [batches, setBatches] = useState([]); // <--- NEW: List of all batches
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // --- 1. THE LOCK VERIFIER ---
  const verifyLockStatus = useCallback(async (batchId) => {
    if (!batchId) return;
    setCheckingStatus(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:8000/api/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Lock if germination date is null (active experiment)
      setIsLocked(res.data.actual_germination_date === null);
    } catch (err) {
      setIsLocked(false); // New batch
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
      // No saved config for this batch — keep current values, only preserve batch name
      if (err.response?.status === 404) {
        setValues(prev => ({ ...prev, batch: batchId }));
      } else {
        console.error(err);
      }
    }
  }, []);

  // --- 2. INITIAL FETCH (Config + Batch List) ---
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");
        // Fetch active config
        const configResp = await axios.get("http://localhost:8000/api/configurations/active", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (configResp.data) setValues(configResp.data);

        // Fetch all batch IDs for the dropdown
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

  // --- 3. AUTO-LOCK WHILE TYPING/SELECTING ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      await loadBatchConfig(values.batch);
      await verifyLockStatus(values.batch);
    }, 600);

    return () => clearTimeout(timer);
  }, [values.batch, loadBatchConfig, verifyLockStatus]);
  
  const setField = (key) => (val) => setValues(prev => ({ ...prev, [key]: val }));
  const onReset = () => setValues(initialValues);

  const onSave = async () => {
  if (isLocked) return;
  const token = localStorage.getItem("token");

  try {
    setStatusMsg({ type: 'info', text: 'AI is calculating germination timeline...' });

    // 1. ML Prediction
    const mlRes = await axios.post("http://localhost:5000/api/predict", values);
    const aiPrediction = mlRes.data.predicted_days;

    // 2. Save Batch
    await axios.post("http://localhost:8000/api/batches", {
      batch_id: values.batch,
      date_planted: new Date().toISOString().split('T')[0],
      predicted_days: aiPrediction
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 3. Save Parameter Configuration to Laravel
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

    // 4. Sync Hardware
    await axios.post("http://localhost:5000/api/update_params", values);

    setStatusMsg({ type: 'success', text: `✅ Optimized! Prediction: ${aiPrediction} days.` });
    verifyLockStatus(values.batch);
  } catch (error) {
    console.error(error);
    setStatusMsg({ type: 'danger', text: 'Integration Error. Check server connections.' });
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
            <Alert variant={statusMsg.type} dismissible onClose={() => setStatusMsg({type:'', text:''})}>{statusMsg.text}</Alert>
          )}
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <ParameterHeader onReset={onReset} onSave={onSave} isLocked={isLocked} checkingStatus={checkingStatus} />
              <ParameterGrid 
                values={values} 
                setField={setField} 
                isLocked={isLocked} 
                existingBatches={batches} // <--- Pass batches list
              />
              <ParameterNote isLocked={isLocked} />
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}