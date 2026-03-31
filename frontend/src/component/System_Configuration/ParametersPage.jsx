import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Container, Card, Spinner, Alert } from "react-bootstrap";
import axios from "axios";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { ParameterHeader, ParameterGrid, ParameterNote } from "./ParameterComponents";

export default function ParametersPage() {
  const initialValues = useMemo(
    () => ({
      batch: "",
      ambientTemp: "",
      ambientHum: "",
      soilMoisture: "",
      soilTemp: "",
      uvStart: "",
      uvDuration: "",
      ledStart: "",
      ledDuration: "",
    }),
    []
  );

  const [values, setValues] = useState(initialValues);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [shutdownBusy, setShutdownBusy] = useState(false);

  const [latestBatch, setLatestBatch] = useState(null);
  const [selectedBatchExists, setSelectedBatchExists] = useState(false);
  const [newBatchBlocked, setNewBatchBlocked] = useState(false);

  const normalizeBatchId = (value) => String(value || "").trim();

  const getBatchDisplayId = (batch) =>
    batch?.actual_batch || batch?.batch_name || batch?.batch_id || "";

  const sortBatchesNewestFirst = (items) => {
    return [...items].sort((a, b) => {
      const aId = Number(a?.id || 0);
      const bId = Number(b?.id || 0);

      if (bId !== aId) return bId - aId;

      const aCreated = new Date(a?.created_at || 0).getTime();
      const bCreated = new Date(b?.created_at || 0).getTime();

      return bCreated - aCreated;
    });
  };

  const determineLockState = useCallback(
    (selectedBatchId, batchList) => {
      const normalizedSelected = normalizeBatchId(selectedBatchId);
      const sorted = sortBatchesNewestFirst(batchList || []);
      const newest = sorted.length > 0 ? sorted[0] : null;

      const existingBatch = sorted.find(
        (b) => normalizeBatchId(getBatchDisplayId(b)) === normalizedSelected
      );

      const latestIncomplete =
        newest && !newest.actual_germination_date;

      const viewingExisting = !!existingBatch;
      const creatingNew = normalizedSelected && !existingBatch;

      setLatestBatch(newest || null);
      setSelectedBatchExists(viewingExisting);
      setNewBatchBlocked(!!(latestIncomplete && creatingNew));

      // Rules:
      // 1. Existing batches are always read-only
      // 2. Creating a new batch is blocked if latest batch is incomplete
      // 3. Creating a new batch is allowed only if latest batch is complete
      const shouldLock = viewingExisting || !!(latestIncomplete && creatingNew);

      setIsLocked(shouldLock);

      if (latestIncomplete && creatingNew) {
        setStatusMsg({
          type: "warning",
          text: `Cannot create a new batch yet. Latest batch (${getBatchDisplayId(
            newest
          )}) is still ongoing and has no germination date.`,
        });
      }
    },
    []
  );

  const loadBatchConfig = useCallback(async (batchId) => {
    const normalized = normalizeBatchId(batchId);
    if (!normalized) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:8000/api/configurations/batch/${encodeURIComponent(normalized)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data) {
        setValues({
          batch: res.data.batch ?? normalized,
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
        setValues((prev) => ({
          ...prev,
          batch: normalized,
        }));
      } else {
        console.error(err);
      }
    }
  }, []);

  const refreshBatches = useCallback(async () => {
    const token = localStorage.getItem("token");
    const batchResp = await axios.get("http://localhost:8000/api/batches", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const batchList = Array.isArray(batchResp.data) ? batchResp.data : [];
    setBatches(batchList);

    return batchList;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");

        const [configResp, batchList] = await Promise.all([
          axios.get("http://localhost:8000/api/configurations/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          refreshBatches(),
        ]);

        const activeConfig = configResp.data;

        if (activeConfig) {
          setValues({
            batch: activeConfig.batch ?? "",
            ambientTemp: activeConfig.ambientTemp ?? 20,
            ambientHum: activeConfig.ambientHum ?? 50,
            soilMoisture: activeConfig.soilMoisture ?? 60,
            soilTemp: activeConfig.soilTemp ?? 25,
            uvStart: activeConfig.uvStart ?? "07:00",
            uvDuration: activeConfig.uvDuration ?? 90,
            ledStart: activeConfig.ledStart ?? "18:00",
            ledDuration: activeConfig.ledDuration ?? 90,
          });

          determineLockState(activeConfig.batch, batchList);
        } else {
          determineLockState("", batchList);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [determineLockState, refreshBatches]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const normalized = normalizeBatchId(values.batch);
      if (!normalized) return;

      setCheckingStatus(true);
      try {
        await loadBatchConfig(normalized);
        determineLockState(normalized, batches);
      } finally {
        setCheckingStatus(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [values.batch, loadBatchConfig, determineLockState, batches]);

  const setField = (key) => (val) =>
    setValues((prev) => ({
      ...prev,
      [key]: val,
    }));

  const onReset = () => {
    setStatusMsg({ type: "", text: "" });

    if (selectedBatchExists) {
      loadBatchConfig(values.batch);
    } else {
      setValues(initialValues);
      determineLockState("", batches);
    }
  };

  const onSave = async () => {
    const batchId = normalizeBatchId(values.batch);

    if (!batchId) {
      setStatusMsg({ type: "danger", text: "Please enter a batch ID." });
      return;
    }

    if (selectedBatchExists) {
      setStatusMsg({
        type: "warning",
        text: "Existing batches are read-only. Select a new batch ID only when the latest batch is completed.",
      });
      return;
    }

    if (newBatchBlocked) {
      setStatusMsg({
        type: "warning",
        text: `Cannot create a new batch while the latest batch (${getBatchDisplayId(
          latestBatch
        )}) is still ongoing.`,
      });
      return;
    }

    const token = localStorage.getItem("token");

    try {
      setStatusMsg({
        type: "info",
        text: "AI is calculating germination timeline...",
      });

      const startTime = performance.now();

      const mlRes = await axios.post("http://localhost:5000/api/predict", {
        ...values,
        batch: batchId,
      });

      const aiPrediction = mlRes.data.predicted_days;

      const endTime = performance.now();
      const calculatedLatency = Math.round(endTime - startTime);

      await axios.post(
        "http://localhost:8000/api/batches",
        {
          batch_id: batchId,
          date_planted: new Date().toISOString(),
          predicted_days: aiPrediction,
          latency_ms: calculatedLatency,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.post(
        "http://localhost:8000/api/configurations",
        {
          batch: batchId,
          ambientTemp: Number(values.ambientTemp),
          ambientHum: Number(values.ambientHum),
          soilMoisture: Number(values.soilMoisture),
          soilTemp: Number(values.soilTemp),
          uvStart: values.uvStart,
          uvDuration: Number(values.uvDuration),
          ledStart: values.ledStart,
          ledDuration: Number(values.ledDuration),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.post("http://localhost:5000/api/update_params", {
        ...values,
        batch: batchId,
      });

      const updatedBatches = await refreshBatches();
      determineLockState(batchId, updatedBatches);

      setStatusMsg({
        type: "success",
        text: `Batch ${batchId} created successfully. Prediction: ${aiPrediction} days. Latency: ${calculatedLatency}ms.`,
      });
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "danger",
        text: "Integration error. Check server connections.",
      });
    }
  };

  const onSequentialShutdown = async () => {
    try {
      setShutdownBusy(true);
      setStatusMsg({
        type: "info",
        text: "Sequential actuator shutdown command sent...",
      });

      await axios.post("http://localhost:5000/api/sequential_shutdown");

      setStatusMsg({
        type: "warning",
        text: "Sequential actuator shutdown started. Active actuators will turn off one by one every 3 seconds.",
      });
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "danger",
        text: "Failed to send sequential shutdown command.",
      });
    } finally {
      setShutdownBusy(false);
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
        <DashboardHeader title="Environment Control" />

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
                latestBatch={latestBatch}
                newBatchBlocked={newBatchBlocked}
                selectedBatchExists={selectedBatchExists}
              />

              <ParameterNote isLocked={isLocked} />
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}