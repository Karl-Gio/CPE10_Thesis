import { useMemo, useState } from "react";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import { ParameterHeader, ParameterGrid, ParameterNote } from "./ParameterComponents";

export default function ParametersPage() {
  const initialValues = useMemo(
    () => ({
      ambientTemp: 24.59,
      ambientHum: 68.36,
      lightIntensity: 243.0,
      soilMoisture: 29.02,
      soilHumidity: 56.2,
      soilTemp: 22.65,
      soilPh: 6.5,
    }),
    []
  );

  const [values, setValues] = useState(initialValues);

  const setField = (key) => (val) => {
    setValues((prev) => ({
      ...prev,
      [key]: val === "" ? "" : Number(val),
    }));
  };

  const onReset = () => setValues(initialValues);

  const onSave = async () => {
    try {
      // Ipapasa nito yung nilagay mong numbers sa website papunta sa Python
      const response = await fetch("http://localhost:5000/api/update_params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      
      if(response.ok) {
        alert("Parameters Successfully Saved and Sent to Control System!");
      }
    } catch (error) {
      console.error("Error connecting to backend", error);
      alert("Failed to send data to Raspberry Pi.");
    }
  };

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
