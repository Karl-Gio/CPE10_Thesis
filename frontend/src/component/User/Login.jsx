import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert, FloatingLabel } from 'react-bootstrap';

function Login() {
    const [formData, setFormData] = useState({ name: '', password: '' });
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
            const response = await axios.post('http://localhost:8000/api/login', formData);
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            navigate('/dashboard');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center min-vh-100 bg-light">
            <Container style={{ maxWidth: '900px' }}>
                <div className="card shadow-lg border-0 overflow-hidden rounded-4">
                    <Row className="g-0">
                        {/* LEFT SIDE: Brand / Visuals (Matches Dashboard Header) */}
                        <Col md={5} className="bg-success d-flex flex-column justify-content-center align-items-center text-white p-5 text-center" 
                             style={{ background: 'linear-gradient(135deg, #198754 0%, #0d6efd 100%)' }}>
                            <div className="mb-4" style={{ fontSize: '4rem' }}>🌱</div>
                            <h3 className="fw-bold">Controlled Environment Portal</h3>
                            <p className="opacity-75 mt-2">
                                Optimize Pechay Seed Germination with Data-Driven Insights.
                            </p>
                        </Col>

                        {/* RIGHT SIDE: Login Form */}
                        <Col md={7} className="bg-white p-5">
                            <div className="mb-4">
                                <h2 className="fw-bold text-dark">Welcome Back</h2>
                                <p className="text-muted">Please enter your details to sign in.</p>
                            </div>

                            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                {/* Name Input with Floating Label */}
                                <FloatingLabel controlId="floatingInput" label="Username" className="mb-3">
                                    <Form.Control 
                                        type="text" 
                                        name="name" 
                                        placeholder="Enter name" 
                                        value={formData.name}
                                        onChange={handleChange} 
                                        required 
                                        className="bg-light border-0"
                                    />
                                </FloatingLabel>

                                {/* Password Input with Floating Label */}
                                <FloatingLabel controlId="floatingPassword" label="Password" className="mb-4">
                                    <Form.Control 
                                        type="password" 
                                        name="password" 
                                        placeholder="Password" 
                                        value={formData.password}
                                        onChange={handleChange} 
                                        required 
                                        className="bg-light border-0"
                                    />
                                </FloatingLabel>

                                <Button 
                                    variant="success" 
                                    type="submit" 
                                    size="lg" 
                                    className="w-100 fw-bold shadow-sm"
                                    disabled={loading}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </Form>

                            <div className="text-center mt-4">
                                <small className="text-muted">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="text-success fw-bold text-decoration-none">
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