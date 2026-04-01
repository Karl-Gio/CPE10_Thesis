import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getBatches,
  getActiveConfiguration,
  getBatchConfiguration,
  createBatch,
  saveConfiguration,
  predictBatch,
  syncParameters,
  sequentialShutdown,
} from "./parameterService";

export const useParametersLogic = () => {
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

  const setField = (key) => (val) =>
    setValues((prev) => ({
      ...prev,
      [key]: val,
    }));

  const refreshBatches = useCallback(async () => {
    const batchList = await getBatches();
    setBatches(batchList);
    return batchList;
  }, []);

  const determineLockState = useCallback((selectedBatchId, batchList) => {
    const normalizedSelected = normalizeBatchId(selectedBatchId);
    const sorted = sortBatchesNewestFirst(batchList || []);
    const newest = sorted[0] || null;

    const existingBatch = sorted.find(
      (b) => normalizeBatchId(getBatchDisplayId(b)) === normalizedSelected
    );

    const latestIncomplete = newest && !newest.actual_germination_date;
    const viewingExisting = !!existingBatch;
    const creatingNew = normalizedSelected && !existingBatch;

    setLatestBatch(newest || null);
    setSelectedBatchExists(viewingExisting);
    setNewBatchBlocked(!!(latestIncomplete && creatingNew));

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
  }, []);

  const loadBatchConfig = useCallback(async (batchId) => {
    const normalized = normalizeBatchId(batchId);
    if (!normalized) return;

    try {
      const data = await getBatchConfiguration(normalized);

      setValues({
        batch: data.batch ?? normalized,
        ambientTemp: data.ambientTemp ?? 25.0,
        ambientHum: data.ambientHum ?? 70.0,
        soilMoisture: data.soilMoisture ?? 35.0,
        soilTemp: data.soilTemp ?? 22.0,
        uvStart: data.uvStart ?? "07:00",
        uvDuration: data.uvDuration ?? 90,
        ledStart: data.ledStart ?? "18:00",
        ledDuration: data.ledDuration ?? 360,
      });
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

  useEffect(() => {
    const init = async () => {
      try {
        const [activeConfig, batchList] = await Promise.all([
          getActiveConfiguration(),
          refreshBatches(),
        ]);

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
      } catch (error) {
        console.error(error);
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

    try {
      setStatusMsg({
        type: "info",
        text: "AI is calculating germination timeline...",
      });

      const startTime = performance.now();

      const mlData = await predictBatch({
        ...values,
        batch: batchId,
      });

      const aiPrediction = mlData.predicted_days;
      const calculatedLatency = Math.round(performance.now() - startTime);

      await createBatch({
        batch_id: batchId,
        date_planted: new Date().toISOString(),
        predicted_days: aiPrediction,
        latency_ms: calculatedLatency,
      });

      await saveConfiguration({
        batch: batchId,
        ambientTemp: Number(values.ambientTemp),
        ambientHum: Number(values.ambientHum),
        soilMoisture: Number(values.soilMoisture),
        soilTemp: Number(values.soilTemp),
        uvStart: values.uvStart,
        uvDuration: Number(values.uvDuration),
        ledStart: values.ledStart,
        ledDuration: Number(values.ledDuration),
      });

      await syncParameters({
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

      await sequentialShutdown();

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

  return {
    values,
    batches,
    loading,
    isLocked,
    checkingStatus,
    statusMsg,
    shutdownBusy,
    latestBatch,
    selectedBatchExists,
    newBatchBlocked,
    setStatusMsg,
    setField,
    onReset,
    onSave,
    onSequentialShutdown,
  };
};