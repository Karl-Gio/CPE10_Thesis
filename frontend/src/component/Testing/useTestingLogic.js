import { useState, useMemo, useEffect } from "react";
import axios from "axios";

// Constants for API endpoints
const LARAVEL_API = "http://localhost:8000/api";
const PYTHON_API = "http://localhost:5000";

// Get token from localStorage for API authorization
const getToken = () => localStorage.getItem("token");

// Get headers for API requests, including authorization if token exists
const getAuthHeaders = () => {
  const token = getToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const useTestingLogic = () => {
  const initialValues = useMemo(
    () => ({
      batch: "",
      ambientTemp: "",
      ambientHum: "",
      soilMoisture: "",
      soilTemp: "",
      duration: "",
      paramUv: 0,
      paramLed: 0,
      manualUv: 0,
      manualLed: 0,
      peltier: 0,
      heater: 0,
      intakeFan: 0,
      exhaustFan: 0,
      buzzer: 0,
      pump: 0,
    }),
    [],
  );

  const [values, setValues] = useState(initialValues);
  const [existingBatchNames, setExistingBatchNames] = useState([]);
  const [sending, setSending] = useState(false);
  const [shutdownBusy, setShutdownBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [allRecords, setAllRecords] = useState([]);

  const setField = (key) => (val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const applyRecordToValues = (record) => {
    if (!record) return;

    setValues((prev) => ({
      ...prev,
      batch: record.batch ?? "",
      ambientTemp: record.ambient_temp ?? "",
      ambientHum: record.humidity ?? "",
      soilMoisture: record.soil_moisture ?? "",
      soilTemp: record.soil_temp ?? "",
      duration: record.duration ?? "",
      paramUv: Number(record.uv ?? 0),
      paramLed: Number(record.led ?? 0),
    }));
  };

  useEffect(() => {
    const fetchTestingParameters = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await axios.get(`${LARAVEL_API}/testing-parameters`, {
          headers: getAuthHeaders(),
        });

        // supports both:
        // 1) plain array response
        // 2) Laravel paginated response where rows are in res.data.data
        const rawRecords = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];

        if (!rawRecords.length) {
          setAllRecords([]);
          setExistingBatchNames([]);
          return;
        }

        // Sort newest first.
        // Priority:
        // 1. higher numeric id
        // 2. newer created_at if id missing
        // 3. newer updated_at if needed
        const sortedRecords = [...rawRecords].sort((a, b) => {
          const aId = Number(a?.id ?? 0);
          const bId = Number(b?.id ?? 0);

          if (bId !== aId) return bId - aId;

          const aCreated = new Date(a?.created_at ?? 0).getTime();
          const bCreated = new Date(b?.created_at ?? 0).getTime();

          if (bCreated !== aCreated) return bCreated - aCreated;

          const aUpdated = new Date(a?.updated_at ?? 0).getTime();
          const bUpdated = new Date(b?.updated_at ?? 0).getTime();

          return bUpdated - aUpdated;
        });

        setAllRecords(sortedRecords);

        setExistingBatchNames(
          sortedRecords
            .map((item) => item.batch?.trim().toLowerCase())
            .filter(Boolean),
        );

        // newest record is now always index 0
        applyRecordToValues(sortedRecords[0]);
      } catch (error) {
        console.error("fetchTestingParameters error:", error);
      }
    };

    fetchTestingParameters();
  }, []);

  const handleBatchSelect = (batchName) => {
    const selectedBatch = allRecords.find(
      (record) => record.batch === batchName,
    );

    if (selectedBatch) {
      applyRecordToValues(selectedBatch);
    }
  };

  const onSendParams = async (currentBatchName) => {
    try {
      setSending(true);
      setStatusMsg({ type: "", text: "" });

      const finalBatchName = currentBatchName.trim();
      const normalizedBatchName = finalBatchName.toLowerCase();

      if (existingBatchNames.includes(normalizedBatchName)) {
        setStatusMsg({
          type: "danger",
          text: "This batch name already exists. Please choose a different batch name.",
        });
        setSending(false);
        return;
      }

      const payload = {
        batch: finalBatchName,
        ambient_temp: Number(values.ambientTemp || 0),
        humidity: Number(values.ambientHum || 0),
        soil_moisture: Number(values.soilMoisture || 0),
        soil_temp: Number(values.soilTemp || 0),
        uv: Number(values.paramUv || 0),
        led: Number(values.paramLed || 0),
        duration: Number(values.duration || 30),
      };

      if (payload.duration < 1) {
        setStatusMsg({
          type: "danger",
          text: "Duration must be at least 1 minute.",
        });
        return;
      }

      const laravelRes = await axios.post(
        `${LARAVEL_API}/testing-parameters`,
        payload,
        { headers: getAuthHeaders() },
      );

      const testingParameterId = laravelRes.data?.data?.id;

      if (!testingParameterId) {
        throw new Error("Laravel did not return testing_parameter_id");
      }

      const pythonPayload = {
        ...payload,
        testing_parameter_id: testingParameterId,
      };

      const pythonRes = await axios.post(
        `${PYTHON_API}/api/testing-parameters`,
        pythonPayload,
      );

      setStatusMsg({
        type: "success",
        text:
          pythonRes.data?.message ||
          "Saved to database and sent to hardware successfully.",
      });

      // Refresh list after save so latest batch immediately becomes top item
      const refreshRes = await axios.get(`${LARAVEL_API}/testing-parameters`, {
        headers: getAuthHeaders(),
      });

      const refreshedRaw = Array.isArray(refreshRes.data?.data)
        ? refreshRes.data.data
        : Array.isArray(refreshRes.data)
          ? refreshRes.data
          : [];

      const refreshedSorted = [...refreshedRaw].sort((a, b) => {
        const aId = Number(a?.id ?? 0);
        const bId = Number(b?.id ?? 0);

        if (bId !== aId) return bId - aId;

        const aCreated = new Date(a?.created_at ?? 0).getTime();
        const bCreated = new Date(b?.created_at ?? 0).getTime();

        if (bCreated !== aCreated) return bCreated - aCreated;

        const aUpdated = new Date(a?.updated_at ?? 0).getTime();
        const bUpdated = new Date(b?.updated_at ?? 0).getTime();

        return bUpdated - aUpdated;
      });

      setAllRecords(refreshedSorted);
      setExistingBatchNames(
        refreshedSorted
          .map((item) => item.batch?.trim().toLowerCase())
          .filter(Boolean),
      );
      applyRecordToValues(refreshedSorted[0]);
    } catch (error) {
      console.error("onSendParams error:", error.response?.data || error);
      setStatusMsg({
        type: "danger",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to start testing session.",
      });
    } finally {
      setSending(false);
    }
  };

  const onSendHardware = async () => {
    try {
      setSending(true);
      setStatusMsg({ type: "", text: "" });

      const payload = {
        uv: Number(values.manualUv || 0),
        led: Number(values.manualLed || 0),
        peltier: Number(values.peltier || 0),
        heater: Number(values.heater || 0),
        intakeFan: Number(values.intakeFan || 0),
        exhaustFan: Number(values.exhaustFan || 0),
        buzzer: Number(values.buzzer || 0),
        pump: Number(values.pump || 0),
      };

      const res = await axios.post(
        `${PYTHON_API}/api/manual-hardware`,
        payload,
      );

      setStatusMsg({
        type: "success",
        text: res.data?.message || "Manual hardware command sent successfully.",
      });
    } catch (error) {
      console.error("onSendHardware error:", error.response?.data || error);
      setStatusMsg({
        type: "danger",
        text:
          error.response?.data?.message ||
          "Failed to send manual hardware command.",
      });
    } finally {
      setSending(false);
    }
  };

  const onSequentialShutdown = async () => {
    try {
      setShutdownBusy(true);
      setStatusMsg({
        type: "info",
        text: "Sequential actuator shutdown command sent...",
      });

      await axios.post(`${PYTHON_API}/api/sequential_shutdown`);

      setStatusMsg({
        type: "warning",
        text: "Sequential actuator shutdown started. Active actuators will turn off one by one every 3 seconds.",
      });
    } catch (error) {
      console.error(
        "onSequentialShutdown error:",
        error.response?.data || error,
      );
      setStatusMsg({
        type: "danger",
        text:
          error.response?.data?.message ||
          "Failed to send sequential shutdown command.",
      });
    } finally {
      setShutdownBusy(false);
    }
  };

  const command = `T<${values.manualUv},${values.manualLed},${values.peltier},${values.heater},${values.intakeFan},${values.exhaustFan},${values.buzzer},${values.pump}>`;

  return {
    values,
    existingBatchNames,
    sending,
    shutdownBusy,
    statusMsg,
    setStatusMsg,
    setField,
    allRecords,
    handleBatchSelect,
    setValues,
    command,
    onSendParams,
    onSendHardware,
    onSequentialShutdown,
  };
};