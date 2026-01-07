import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Form, Button, Alert } from "react-bootstrap";
import { SlidersVertical } from "lucide-react";

function Login() {
  const [formData, setFormData] = useState({ name: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/login",
        formData
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center min-vh-100"
      style={{
        background: "#0F172B",
        backgroundImage:
          "radial-gradient(1000px 500px at 20% 10%, rgba(20, 184, 166, 0.18), transparent 60%), radial-gradient(900px 450px at 80% 90%, rgba(13, 110, 253, 0.18), transparent 55%)",
      }}
    >
      <Container style={{ maxWidth: "980px" }}>
        <div
          className="card shadow-lg border-0 overflow-hidden"
          style={{ borderRadius: 20, background: "rgba(255,255,255,0.96)" }}
        >
          <Row className="g-0">
            {/* LEFT SIDE */}
            <Col
              md={5}
              className="d-flex flex-column justify-content-center align-items-center text-white text-center p-5"
              style={{
                background:
                  "linear-gradient(135deg, #064e3b 0%, #14b8a6 55%, #0d6efd 100%)",
              }}
            >
              <div className="d-flex justify-content-center mb-3">
                <div
                  className="d-flex align-items-center justify-content-center shadow-sm"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <SlidersVertical size={26} color="white" strokeWidth={2.2} />
                </div>
              </div>

              <h3 className="fw-bold mb-2" style={{ lineHeight: 1.15 }}>
                Pechay Seed
                <br />
                Germination System
              </h3>

              <div
                className="fw-semibold"
                style={{ letterSpacing: "0.14em", opacity: 0.9, fontSize: 12 }}
              >
                GROUP 10
              </div>
            </Col>

            {/* RIGHT SIDE */}
            <Col md={7} className="p-4 p-md-5">
              <div className="mb-4">
                <h2 className="fw-bold mb-1" style={{ color: "#1f2937" }}>
                  Welcome Back
                </h2>
                <p className="mb-0" style={{ color: "#64748b" }}>
                  Please enter your details to sign in.
                </p>
              </div>

              {error && (
                <Alert variant="danger" className="py-2">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Username */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="fw-semibold"
                    style={{ color: "#334155" }}
                  >
                    Username
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Enter your username"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    className="py-3"
                    style={{
                      borderRadius: 12,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </Form.Group>

                {/* Password */}
                <Form.Group className="mb-4">
                  <Form.Label
                    className="fw-semibold"
                    style={{ color: "#334155" }}
                  >
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="py-3"
                    style={{
                      borderRadius: 12,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  className="w-100 fw-bold py-3 border-0"
                  style={{
                    borderRadius: 12,
                    background: "#0B1324",
                    boxShadow: "0 10px 20px rgba(2, 6, 23, 0.25)",
                  }}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </Form>

              <div className="text-center mt-4">
                <small style={{ color: "#64748b" }}>
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/register"
                    className="fw-semibold text-decoration-none"
                    style={{ color: "#16a34a" }}
                  >
                    Register here
                  </Link>
                </small>
              </div>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
}

export default Login;