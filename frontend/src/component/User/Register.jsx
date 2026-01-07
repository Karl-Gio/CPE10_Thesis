import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { SlidersVertical } from "lucide-react";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/register", formData);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center min-vh-100 px-3"
      style={{
        background: "#0F172B",
        backgroundImage:
          "radial-gradient(1000px 500px at 20% 10%, rgba(20, 184, 166, 0.18), transparent 60%), radial-gradient(900px 450px at 80% 90%, rgba(13, 110, 253, 0.18), transparent 55%)",
      }}
    >
      <Card
        className="border-0 shadow-lg"
        style={{
          width: "420px",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.96)",
        }}
      >
        <Card.Body className="p-4 p-md-5">
          {/* Icon */}
          <div className="d-flex justify-content-center mb-3">
            <div
              className="d-flex align-items-center justify-content-center shadow-sm"
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                background: "linear-gradient(135deg, #064e3b 0%, #14b8a6 100%)",
              }}
            >
              <SlidersVertical size={26} color="white" strokeWidth={2.2} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h2
              className="fw-bold mb-1"
              style={{ color: "#1f2937", fontSize: "1.9rem" }}
            >
              Pechay Seed Germination System
            </h2>
            <div
              className="fw-semibold"
              style={{
                letterSpacing: "0.14em",
                color: "#64748b",
                fontSize: 12,
              }}
            >
              GROUP 10
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="py-2">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Username */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold" style={{ color: "#334155" }}>
                User ID / Username
              </Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Enter your ID"
                onChange={handleChange}
                required
                className="py-3"
                style={{
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              />
            </Form.Group>

            {/* Password */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold" style={{ color: "#334155" }}>
                Password
              </Form.Label>
              <Form.Control
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
                className="py-3"
                style={{
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              />
            </Form.Group>

            {/* Confirm Password */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold" style={{ color: "#334155" }}>
                Confirm Password
              </Form.Label>
              <Form.Control
                type="password"
                name="password_confirmation"
                placeholder="Confirm Password"
                onChange={handleChange}
                required
                className="py-3"
                style={{
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              />
            </Form.Group>

            {/* Button */}
            <Button
              type="submit"
              className="w-100 fw-bold py-3 border-0"
              style={{
                borderRadius: 12,
                background: "#0B1324",
                boxShadow: "0 10px 20px rgba(2, 6, 23, 0.25)",
              }}
            >
              Register
            </Button>
          </Form>

          {/* Footer */}
          <div className="text-center mt-4">
            <small style={{ color: "#64748b" }}>
              Already have an account?{" "}
              <Link
                to="/"
                style={{ color: "#16a34a" }}
                className="fw-semibold text-decoration-none"
              >
                Log In
              </Link>
            </small>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Register;