// 1. IMPORT THE BOOTSTRAP COMPONENTS
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useState, useEffect } from 'react';

// --- COMPONENT 1: NAVBAR ---
// Pass 'user' as a prop from your parent component (e.g., Dashboard or App)
export function TopBar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  // 1. Fetch User Name on Component Mount
  useEffect(() => {
    const userString = localStorage.getItem('user'); // Get the string
    if (userString) {
      const userObject = JSON.parse(userString); // Convert string back to Object
      setUserName(userObject.name); // Access the 'name' property
    }
  }, []);

  // 2. Handle Logout Logic
  const handleLogout = async () => {
    const token = localStorage.getItem('token'); // Matches your Login.js key

    try {
      // Optional: Tell Backend to invalidate token
      await axios.post('http://localhost:8000/api/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // 3. Clear Local Storage (Crucial)
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // 4. Redirect to Login
    navigate('/');
  };

  return (
    <Navbar bg="success" variant="dark" className="shadow-sm">
      <Container>
        <Navbar.Brand className="fw-bold">
          🌱 Controlled Environment Portal
        </Navbar.Brand>
        <div className="text-white">
          {/* Display the variable we set in useEffect */}
          Welcome, {userName || 'User'} | 
          <Button 
            variant="outline-light" 
            size="sm" 
            className="ms-2" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </Container>
    </Navbar>
  );
}

// --- COMPONENT 2: STATUS & PREDICTION ---
export function StatusSection() {
  return (
    <>
      {/* System Status Card */}
      <Card className="shadow-sm border-success border-top-0 border-end-0 border-bottom-0 border-4 mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div>
            <Card.Title className="mb-1">Pechay Germination</Card.Title>
            <Card.Text className="text-muted mb-0">
              System Status: <strong className="text-success">OPTIMAL</strong>
            </Card.Text>
          </div>
          <Badge bg="white" text="danger" className="border border-danger p-2">
            🔴 LIVE 2025-10-17 14:35
          </Badge>
        </Card.Body>
      </Card>

      {/* Prediction Banner (Blue Box) */}
      <Card bg="primary" text="white" className="shadow-sm mb-4">
        <Card.Body className="d-flex justify-content-between text-center align-items-center flex-wrap">
          <div className="p-2">
            <h2 className="mb-0">3.5 days</h2>
            <small className="opacity-75">Expected Germination</small>
          </div>
          <div className="p-2">
            <h2 className="mb-0">2025-10-21</h2>
            <small className="opacity-75">Predicted Date</small>
          </div>
          <div className="p-2">
            <h2 className="mb-0">95%</h2>
            <small className="opacity-75">Confidence</small>
          </div>
          <div className="p-2">
            <h2 className="mb-0">Excellent</h2>
            <small className="opacity-75">Conditions</small>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

// --- COMPONENT 3: SENSOR GRID ---
export function SensorGrid() {
  const sensors = [
    { label: "Temperature", value: "24.9", optimal: "25" },
    { label: "Humidity", value: "69.9", optimal: "70" },
    { label: "Soil Moisture", value: "30.1", optimal: "30" },
    { label: "Light Intensity", value: "250.1", optimal: "250" },
    { label: "pH Level", value: "6.5", optimal: "6.5" },
  ];

  return (
    <>
      <h5 className="text-muted mb-3">📊 Growing Environment Parameters</h5>
      <Row className="g-3 mb-4">
        {sensors.map((sensor, index) => (
          <Col xs={12} sm={6} md={true} key={index}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <h6 className="text-muted">{sensor.label}</h6>
                <h2 className="text-success fw-bold my-2">{sensor.value}</h2>
                <small className="text-muted d-block mb-2">Optimal: {sensor.optimal}</small>
                <Badge bg="success" className="bg-opacity-25 text-success border border-success">Optimal</Badge>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

// --- COMPONENT 4: BOTTOM EXPERIMENT SECTION ---
export function ExperimentSection() {
    return (
        <Row className="g-4">
            {/* Experiment Panel */}
            <Col md={6}>
                <Card className="h-100 shadow-sm border-success border-top-0 border-end-0 border-bottom-0 border-4">
                <Card.Header className="bg-success text-white">Current Experiment</Card.Header>
                <Card.Body>
                    <p>Pechay Variety: <strong>Hari Digma</strong></p>
                    <p className="text-muted small">Start Date: 2025-10-17</p>
                    
                    {/* React Bootstrap Progress Bar */}
                    <ProgressBar now={57} label="Day 4 of 7" className="mb-3" style={{ height: '20px' }} />

                    <div className="d-flex justify-content-between text-center small text-muted">
                    <div><div className="fw-bold">25°C</div><div>Avg Temp</div></div>
                    <div><div className="fw-bold">70%</div><div>Avg Humidity</div></div>
                    <div><div className="fw-bold">3.5</div><div>Days Left</div></div>
                    </div>
                </Card.Body>
                </Card>
            </Col>

            {/* Analytics Panel */}
            <Col md={6}>
                <Card className="h-100 shadow-sm border border-primary"> 
                    <Card.Header className="bg-primary text-white">Farm Analytics</Card.Header>
                    <Card.Body className="text-center d-flex flex-column justify-content-center">
                        <Row className="g-3"> {/* g-3 adds space (gap) between the cards */}
                            {/* LEFT CARD */}
                            <Col xs={6}>
                                <Card className="text-center h-100 shadow-sm">
                                    <Card.Body>
                                        <h3 className="text-primary">95%</h3>
                                        <p className="text-muted">System Uptime</p>
                                        <Badge bg="success" className="bg-opacity-25 text-success border border-success">
                                            Optimal
                                        </Badge>
                                    </Card.Body>
                                </Card>
                            </Col>
                            {/* RIGHT CARD */}
                            <Col xs={6}>
                                <Card className="text-center h-100 shadow-sm">
                                    <Card.Body>
                                        <h5 className="mb-0">24/7</h5>
                                        <small className="text-muted">Monitoring</small>
                                        <div className="mt-2"> {/* Added margin top for spacing */}
                                            <Badge bg="success" className="bg-opacity-25 text-success border border-success">
                                                Optimal
                                            </Badge>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                        <Row className="g-3 mt-2 text-start"> 
                            <Col>
                                <h6 className="mb-2">Optimal Parameters</h6>
                                {/* Added variant="success" for green color */}
                                <ProgressBar 
                                    variant="success" 
                                    now={100} 
                                    label="5/5 Parameters" 
                                    className="mb-0" 
                                    style={{ height: '20px' }} 
                                />
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}