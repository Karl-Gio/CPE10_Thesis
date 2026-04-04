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
    [],
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
      (b) => normalizeBatchId(getBatchDisplayId(b)) === normalizedSelected,
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
          newest,
        )}) is still ongoing and has no germination date.`,
      });
    } else if (!normalizedSelected) {
      setStatusMsg({ type: "", text: "" });
    }
  }, []);

  const applyConfigToValues = useCallback((data, fallbackBatch = "") => {
    setValues({
      batch: data?.batch ?? fallbackBatch ?? "",
      ambientTemp: data?.ambientTemp ?? "",
      ambientHum: data?.ambientHum ?? "",
      soilMoisture: data?.soilMoisture ?? "",
      soilTemp: data?.soilTemp ?? "",
      uvStart: data?.uvStart ?? "",
      uvDuration: data?.uvDuration ?? "",
      ledStart: data?.ledStart ?? "",
      ledDuration: data?.ledDuration ?? "",
    });
  }, []);

  const loadBatchConfig = useCallback(
    async (batchId) => {
      const normalized = normalizeBatchId(batchId);
      if (!normalized) return;

      try {
        const data = await getBatchConfiguration(normalized);

        if (!data) {
          // Keep current parameter values.
          // Only update the batch field so the user can type a new batch name
          // without wiping the previously loaded configuration.
          setValues((prev) => ({
            ...prev,
            batch: normalized,
          }));
          return;
        }

        applyConfigToValues(data, normalized);
      } catch (err) {
        console.error("loadBatchConfig error:", err);
      }
    },
    [applyConfigToValues],
  );

  useEffect(() => {
    const init = async () => {
      try {
        const [activeConfig, batchList] = await Promise.all([
          getActiveConfiguration(),
          refreshBatches(),
        ]);

        if (activeConfig) {
          applyConfigToValues(activeConfig, activeConfig.batch ?? "");
          determineLockState(activeConfig.batch, batchList);
        } else {
          setValues(initialValues);
          determineLockState("", batchList);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [applyConfigToValues, determineLockState, initialValues, refreshBatches]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const normalized = normalizeBatchId(values.batch);
      if (!normalized) {
        determineLockState("", batches);
        return;
      }

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
          latestBatch,
        )}) is still ongoing.`,
      });
      return;
    }

    try {
      setStatusMsg({
        type: "info",
        text: "Saving batch first, then configuration, then syncing to Raspberry Pi...",
      });

      const startTime = performance.now();

      const mlData = await predictBatch({
        ...values,
        batch: batchId,
      });

      const aiPrediction = mlData.predicted_days;
      const calculatedLatency = Math.round(performance.now() - startTime);

      // 1. CREATE BATCH FIRST
      await createBatch({
        batch_id: batchId,
        date_planted: new Date().toISOString(),
        predicted_days: aiPrediction ?? null,
        latency_ms: calculatedLatency,
      });

      // 2. SAVE CONFIG USING PUBLIC batch_id, NOT DB id
      await saveConfiguration({
        batchId: batchId,
        ambientTemp: Number(values.ambientTemp),
        ambientHum: Number(values.ambientHum),
        soilMoisture: Number(values.soilMoisture),
        soilTemp: Number(values.soilTemp),
        uvStart: values.uvStart,
        uvDuration: Number(values.uvDuration),
        ledStart: values.ledStart,
        ledDuration: Number(values.ledDuration),
      });

      // 3. SYNC TO PYTHON / RPI
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

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.batch_id?.[0] ||
        "Integration error. Check server connections.";

      setStatusMsg({
        type: "danger",
        text: backendMessage,
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
