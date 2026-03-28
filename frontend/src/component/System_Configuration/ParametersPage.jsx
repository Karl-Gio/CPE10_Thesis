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
    if (!token) { alert("Session expired."); return; }

    // 1. Sanitize Data
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
      // --- STEP 1: ENSURE BATCH EXISTS ---
      console.log("Checking if Batch exists...");
      try {
        await axios.get(`http://localhost:8000/api/batches/${sanitizedValues.batch}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Batch already exists.");
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log("Creating new batch entry...");
          // Since Batch store requires date and predicted days, we provide defaults:
          await axios.post("http://localhost:8000/api/batches", {
            batch_id: sanitizedValues.batch,
            date_planted: new Date().toISOString().split('T')[0], // Today
            predicted_days: 7 // Default prediction for Pechay
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log("✅ New Batch Created.");
        }
      }

      // --- STEP 2: SAVE CONFIG TO LARAVEL ---
      await axios.post("http://localhost:8000/api/configurations", sanitizedValues, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("✅ Parameters saved to DB.");

      // --- STEP 3: SEND TO PYTHON CONTROL SYSTEM ---
      const piResponse = await fetch("http://localhost:5000/api/update_params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedValues)
      });

      if (piResponse.ok) {
        alert(`✅ Success! Batch ${sanitizedValues.batch} is now active.`);
      } else {
        alert("Database updated, but hardware control system is offline.");
      }

    } catch (error) {
      console.error("❌ Save Error:", error);
      alert("Failed to sync systems. Check console for details.");
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