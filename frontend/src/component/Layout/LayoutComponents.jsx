import Nav from "react-bootstrap/Nav";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";

/* ---------------- Sidebar ---------------- */

export function SideBar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        "http://localhost:8000/api/logout",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "10px 12px",
    borderRadius: 10,
    textDecoration: "none",
    color: isActive ? "#198754" : "#334155",
    background: isActive ? "rgba(25,135,84,0.10)" : "transparent",
    fontWeight: isActive ? 700 : 600,
  });

  return (
    <div className="bg-dark text-white d-flex flex-column p-3" style={{ width: 260, minHeight: "100vh" }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <div
          className="bg-success text-dark fw-bold d-flex align-items-center justify-content-center"
          style={{ width: 34, height: 34, borderRadius: 10 }}
        >
          A
        </div>
        <div className="fw-bold">PechayGermination</div>
      </div>

      <div className="text-uppercase small opacity-75 mb-2">Monitoring</div>
      <Nav className="flex-column gap-1 mb-3">
        <NavLink to="/dashboard" style={linkStyle}>📊 Dashboard</NavLink>
        <NavLink to="/prediction" style={linkStyle}>📈 Prediction</NavLink>
      </Nav>

      <div className="text-uppercase small opacity-75 mb-2">Controls</div>
      <Nav className="flex-column gap-1">
        <NavLink to="/parameters" style={linkStyle}>⚙️ Parameters</NavLink>
        <NavLink to="/validation" style={linkStyle}>✅ Validation</NavLink>
      </Nav>

      <div className="mt-auto pt-3 border-top border-light border-opacity-25">
        <Button variant="outline-light" size="sm" className="w-100" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Top Header ---------------- */

export function DashboardHeader({ title }) {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      const userObject = JSON.parse(userString);
      setUserName(userObject.name || "");
    }
  }, []);

  const initial = (userName?.[0] || "U").toUpperCase();

  return (
    <div className="d-flex align-items-center justify-content-between border-bottom bg-white px-4 py-3">
      <div className="d-flex align-items-center gap-3">
        <h4 className="mb-0 fw-bold">{title}</h4>

        <div style={{ width: 1, height: 18, backgroundColor: "#e5e7eb" }} />

        <Badge
          bg="success"
          className="rounded-pill px-3 py-2 bg-opacity-10 text-success border border-success"
        >
          <span className="me-2">●</span> System Online
        </Badge>
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="text-end">
          <div className="fw-semibold text-dark">{userName || "User"}</div>
          <div className="small text-muted">Lead Researcher</div>
        </div>

        <div
          className="bg-dark text-white d-flex align-items-center justify-content-center fw-bold"
          style={{ width: 40, height: 40, borderRadius: 999 }}
        >
          {initial}
        </div>
      </div>
    </div>
  );
}