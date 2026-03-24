import { useMemo, useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import axios from "axios";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { ParameterHeader, ParameterGrid, ParameterNote } from "./ParameterComponents";

export default function ParametersPage() {
 const initialValues = useMemo(
    () => ({
      ambientTemp: 25.0,
      ambientHum: 70.0,
      soilMoisture: 35.0,
      soilTemp: 22.0,
      uvStart: "07:00",    // Default: 7 AM
      uvDuration: 90,      // Default: 90 mins (1.5 hrs)
      ledStart: "18:00",   // Default: 6 PM
      ledDuration: 360     // Default: 6 hrs
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
      [key]: (key.includes("Start")) ? val : (val === "" ? "" : Number(val)),
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

    try {
      // --- STEP 1: SAVE TO LARAVEL (Database Logging) ---
      console.log("Step 1: Saving to Laravel...");
      await axios.post("http://localhost:8000/api/configurations", values, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("✅ Step 1 Success: Database Updated");

      // --- STEP 2: SEND TO PYTHON (Hardware Control via Vite Proxy) ---
      console.log("Step 2: Sending to Python Control System...");
      
      /**
       * PANSININ: Ginagamit natin ang '/api_python' proxy shortcut.
       * Ito ang mag-aayos ng CORS error mo dahil si Vite na ang 
       * kakausap sa Flask para sa iyo.
       */
      const piResponse = await fetch("/api_python/api/update_params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (piResponse.ok) {
        console.log("✅ Step 2 Success: Arduino Notified");
        alert("✅ Success: Parameters saved and Control System updated!");
      } else {
        console.warn("⚠️ Step 2 Failed: Python error");
        alert("Database updated, but the Control System (Python) returned an error.");
      }

    } catch (error) {
      console.error("❌ Catch Block Error:", error);
      
      // Iba-iba ang handling base sa kung saan nag-fail
      if (error.response) {
        // Error galing sa Laravel (401, 500, etc.)
        alert(`Database Error: ${error.response.status} - ${error.response.data.message || 'Check Laravel Logs'}`);
      } else {
        // Network error (CORS or Server Offline)
        alert("Network Error: Could not reach the servers. Ensure both Laravel and Python are running.");
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