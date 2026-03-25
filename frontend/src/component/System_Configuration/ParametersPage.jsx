import { useMemo, useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import axios from "axios";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { ParameterHeader, ParameterGrid, ParameterNote } from "./ParameterComponents";

export default function ParametersPage() {
 const initialValues = useMemo(
    () => ({
      batch: "Batch A",
      ambientTemp: 25.0,
      ambientHum: 70.0,
      soilMoisture: 35.0,
      soilTemp: 22.0,
      uvStart: "07:00",
      uvDuration: 90,
      ledStart: "18:00",
      ledDuration: 360
    }),
    []
  );

  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH DATA FROM LARAVEL ON LOAD ---
  useEffect(() => {
    const fetchActiveConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        // Ginagamit ang Laravel port (8000)
        const response = await axios.get("http://localhost:8000/api/configurations/active", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          setValues(response.data);
        }
      } catch (error) {
        console.error("Error fetching configuration:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveConfig();
  }, []);

  const setField = (key) => (val) => {
    setValues((prev) => ({
      ...prev,
      [key]: val, // Keep it as a string while typing
    }));
  };

  const onReset = () => setValues(initialValues);

  // --- 2. SAVE TO LARAVEL AND SEND TO PYTHON ---
const onSave = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Session expired. Please login again.");
    return;
  }

  // --- STEP 0: SANITIZE DATA ---
  const sanitizedValues = {
  ...values,
  batch: values.batch?.trim() || "Batch A",
  ambientTemp: parseFloat(values.ambientTemp) || 0,
  ambientHum: parseFloat(values.ambientHum) || 0,
  soilMoisture: parseFloat(values.soilMoisture) || 0,
  soilTemp: parseFloat(values.soilTemp) || 0,
  uvDuration: parseInt(values.uvDuration) || 0,
  ledDuration: parseInt(values.ledDuration) || 0,
};

  try {
    // --- STEP 1: SAVE TO LARAVEL ---
    console.log("Step 1: Saving to Laravel...");
    await axios.post("http://localhost:8000/api/configurations", sanitizedValues, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Step 1 Success: Database Updated");

    // --- STEP 2: SEND TO PYTHON (FIXED URL) ---
    console.log("Step 2: Sending to Python Control System...");
    
    const piResponse = await fetch("http://localhost:5000/api/update_params", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedValues)
    });

    if (piResponse.ok) {
      const result = await piResponse.json();
      console.log("✅ Step 2 Success: Arduino Notified", result);
      alert(`✅ Success! Parameters saved.\nUV: ${result.uv === 1 ? 'ON' : 'OFF'}\nLED: ${result.led === 1 ? 'ON' : 'OFF'}`);
    } else {
      const errorData = await piResponse.json().catch(() => ({}));
      console.warn("⚠️ Step 2 Failed:", errorData);
      alert(`Database updated, but Python error: ${errorData.message || "Unknown error"}`);
    }

  } catch (error) {
    console.error("❌ Catch Block Error:", error);
    
    if (error.response) {
      alert(`Database Error: ${error.response.status} - ${error.response.data.message || 'Check Laravel Logs'}`);
    } else {
      alert("Network Error: Could not reach the servers. Is the Python Flask app running on port 5000?");
    }
  }
};

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
       <div className="text-center">
         <div className="spinner-border text-success mb-2"></div>
         <p>Loading System Configuration...</p>
       </div>
    </div>
  );

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="System Configuration" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <ParameterHeader onReset={onReset} onSave={onSave} />
              <ParameterGrid values={values} setField={setField} />
              <ParameterNote />
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}