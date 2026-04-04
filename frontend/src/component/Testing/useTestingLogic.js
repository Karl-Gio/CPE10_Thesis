import { useState, useMemo, useEffect } from "react";
import axios from "axios";

const LARAVEL_API = "http://localhost:8000/api";
const PYTHON_API = "http://localhost:5000";

const getToken = () => localStorage.getItem("token");

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
    []
  );

  const [values, setValues] = useState(initialValues);
  const [existingBatchNames, setExistingBatchNames] = useState([]);
  const [sending, setSending] = useState(false);
  const [shutdownBusy, setShutdownBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const setField = (key) => (val) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    const fetchTestingParameters = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await axios.get(`${LARAVEL_API}/testing-parameters`, {
          headers: getAuthHeaders(),
        });

        const records = Array.isArray(res.data) ? res.data : [];

        const batchNames = records
          .map((item) => item.batch?.trim().toLowerCase())
          .filter(Boolean);

        setExistingBatchNames(batchNames);

        const latest = records[0];
        if (!latest) return;

        setValues((prev) => ({
          ...prev,
          batch: latest.batch ?? "",
          ambientTemp: latest.ambient_temp ?? "",
          ambientHum: latest.humidity ?? "",
          soilMoisture: latest.soil_moisture ?? "",
          soilTemp: latest.soil_temp ?? "",
          duration: latest.duration ?? "",

          paramUv: Number(latest.uv ?? 0),
          paramLed: Number(latest.led ?? 0),

          manualUv: prev.manualUv,
          manualLed: prev.manualLed,
          peltier: prev.peltier,
          heater: prev.heater,
          intakeFan: prev.intakeFan,
          exhaustFan: prev.exhaustFan,
          buzzer: prev.buzzer,
          pump: prev.pump,
        }));
      } catch (error) {
        console.error(
          "fetchTestingParameters error:",
          error.response?.data || error
        );
      }
    };

    fetchTestingParameters();
  }, []);

  const command = `T<${values.manualUv},${values.manualLed},${values.peltier},${values.heater},${values.intakeFan},${values.exhaustFan},${values.buzzer},${values.pump}>`;

  const onSendParams = async () => {
    try {
      setSending(true);
      setStatusMsg({ type: "", text: "" });

      const normalizedBatch = (values.batch || "").trim().toLowerCase();

      if (!normalizedBatch) {
        setStatusMsg({ type: "danger", text: "Batch name is required." });
        return;
      }

      if (normalizedBatch === "all") {
        setStatusMsg({
          type: "danger",
          text: 'Batch name "all" is not allowed.',
        });
        return;
      }

      if (existingBatchNames.includes(normalizedBatch)) {
        setStatusMsg({
          type: "danger",
          text: "Batch name already exists in the database.",
        });
        return;
      }

      const payload = {
        batch: values.batch.trim(),
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

      // 1. Save main testing session to Laravel
      const laravelRes = await axios.post(
        `${LARAVEL_API}/testing-parameters`,
        payload,
        { headers: getAuthHeaders() }
      );

      const testingParameterId = laravelRes.data?.data?.id;

      if (!testingParameterId) {
        throw new Error("Laravel did not return testing_parameter_id");
      }

      // 2. Send command + session id to Python
      const pythonPayload = {
        ...payload,
        testing_parameter_id: testingParameterId,
      };

      const pythonRes = await axios.post(
        `${PYTHON_API}/api/testing-parameters`,
        pythonPayload
      );

      setExistingBatchNames((prev) => [...prev, normalizedBatch]);

      setStatusMsg({
        type: "success",
        text:
          pythonRes.data?.message ||
          "Saved to database and sent to hardware successfully.",
      });
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
        payload
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
        error.response?.data || error
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

  return {
    values,
    existingBatchNames,
    sending,
    shutdownBusy,
    statusMsg,
    setStatusMsg,
    setField,
    command,
    onSendParams,
    onSendHardware,
    onSequentialShutdown,
  };
};