import { useState, useMemo } from "react";
import axios from "axios";

export const useTestingLogic = () => {
  const initialValues = useMemo(() => ({
    batch: "",
    ambientTemp: "",
    ambientHum: "",
    soilMoisture: "",
    soilTemp: "",
    uvStart: "",
    uvDuration: "",
    ledStart: "",
    ledDuration: "",
    uv: 0,
    led: 0,
    peltier: 0,
    heater: 0,
    intakeFan: 0,
    exhaustFan: 0,
    buzzer: 0,
    pump: 0,
  }), []);

  const [values, setValues] = useState(initialValues);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const setField = (key) => (val) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const command = `T<${values.uv},${values.led},${values.peltier},${values.heater},${values.intakeFan},${values.exhaustFan},${values.buzzer},${values.pump}>`;

  const onSendParams = async () => {
    try {
      setSending(true);
      const { uv, led, peltier, heater, intakeFan, exhaustFan, buzzer, pump, ...params } = values;
      await axios.post("http://localhost:5000/api/update_params", params);
      setStatusMsg({ type: "success", text: "Parameters sent successfully!" });
    } catch (error) {
      setStatusMsg({ type: "danger", text: "Failed to send parameters." });
    } finally {
      setSending(false);
    }
  };

  const onSendHardware = async () => {
    try {
      setSending(true);
      await axios.post("http://localhost:5000/api/testing_command", { command });
      setStatusMsg({ type: "success", text: `Hardware command sent: ${command}` });
    } catch (error) {
      setStatusMsg({ type: "danger", text: "Failed to send hardware command." });
    } finally {
      setSending(false);
    }
  };

  return {
    values,
    sending,
    statusMsg,
    setStatusMsg,
    setField,
    command,
    onSendParams,
    onSendHardware
  };
};