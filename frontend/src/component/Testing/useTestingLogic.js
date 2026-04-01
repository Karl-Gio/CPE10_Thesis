import { useState, useMemo } from "react";
import axios from "axios";

export const useTestingLogic = () => {
    const initialValues = useMemo(
        () => ({
        batch: "",
        ambientTemp: "",
        ambientHum: "",
        soilMoisture: "",
        soilTemp: "",
        duration: "",
        uv: 0,
        led: 0,
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
    const [sending, setSending] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

    const setField = (key) => (val) =>
        setValues((prev) => ({ ...prev, [key]: val }));

    const command = `T<${values.uv},${values.led},${values.peltier},${values.heater},${values.intakeFan},${values.exhaustFan},${values.buzzer},${values.pump}>`;

    const onSendParams = async () => {
        try {
        setSending(true);
        setStatusMsg({ type: "", text: "" });

        const payload = {
            batch: values.batch?.trim() || "Batch A",
            ambient_temp: Number(values.ambientTemp || 0),
            ambient_humidity: Number(values.ambientHum || 0),
            soil_moisture: Number(values.soilMoisture || 0),
            soil_temp: Number(values.soilTemp || 0),
            uv: Number(values.uv || 0),
            led: Number(values.led || 0),
            duration: Number(values.duration || 30),
        };

        if (payload.duration < 1) {
            setStatusMsg({
            type: "danger",
            text: "Duration must be at least 1 minute.",
            });
            return;
        }

        const res = await axios.post(
            "http://localhost:5000/api/testing-parameters",
            payload
        );

        setStatusMsg({
            type: "success",
            text: res.data?.message || "Testing session started successfully.",
        });
        } catch (error) {
        console.error("onSendParams error:", error.response?.data || error);

        setStatusMsg({
            type: "danger",
            text:
            error.response?.data?.message ||
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
            uv: Number(values.uv || 0),
            led: Number(values.led || 0),
            peltier: Number(values.peltier || 0),
            heater: Number(values.heater || 0),
            intakeFan: Number(values.intakeFan || 0),
            exhaustFan: Number(values.exhaustFan || 0),
            buzzer: Number(values.buzzer || 0),
            pump: Number(values.pump || 0),
            };

            const res = await axios.post(
            "http://localhost:5000/api/manual-hardware",
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

  return {
    values,
    sending,
    statusMsg,
    setStatusMsg,
    setField,
    command,
    onSendParams,
    onSendHardware,
  };
};