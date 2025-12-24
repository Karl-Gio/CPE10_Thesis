import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Send data to Laravel API
            await axios.post('http://localhost:8000/api/register', formData);
            // If successful, redirect to Login
            navigate('/');
        } catch (err) {
            // Show error message from backend
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100 min-vw-100 bg-light">
            <Card className="shadow-lg p-4" style={{ width: '400px' }}>
                <Card.Body>
                    <h2 className="text-center text-success mb-4 fw-bold">🌱 Join the Portal</h2>
                    
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control type="text" name="name" placeholder="Enter name" onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name="password" placeholder="Password" onChange={handleChange} required />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control type="password" name="password_confirmation" placeholder="Confirm Password" onChange={handleChange} required />
                        </Form.Group>

                        <Button variant="success" type="submit" className="w-100 fw-bold">
                            Create Account
                        </Button>
                    </Form>
                    
                    <div className="text-center mt-3">
                        <small>Already have an account? <Link to="/" className="text-success">Login here</Link></small>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default Register;