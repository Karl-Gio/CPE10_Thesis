import Nav from "react-bootstrap/Nav";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import "./LayoutComponents.css";

/* ---------------- Sidebar ---------------- */

export function SideBar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await axios.post(
          "http://localhost:8000/api/logout",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  return (
    <aside className="app-sidebar d-flex flex-column">
      <div className="app-sidebar__brand d-flex align-items-center gap-2">
        <div>
          <div className="app-sidebar__brand-title">PechayGermination</div>
          <div className="app-sidebar__brand-subtitle">Monitoring Platform</div>
        </div>
      </div>

      <div className="app-sidebar__group">
        <div className="app-sidebar__label">Monitoring</div>
        <Nav className="flex-column gap-1">
          <NavLink to="/dashboard" end className={({ isActive }) => navLinkClass(isActive)}>
            <span className="app-sidebar__icon">📊</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/prediction" className={({ isActive }) => navLinkClass(isActive)}>
            <span className="app-sidebar__icon">📈</span>
            <span>Prediction</span>
          </NavLink>

          <NavLink to="/maintainability" className={({ isActive }) => navLinkClass(isActive)}>
            <span className="app-sidebar__icon">🛠️</span>
            <span>Maintainability</span>
          </NavLink>
        </Nav>
      </div>

      <div className="app-sidebar__group">
        <div className="app-sidebar__label">Controls</div>
        <Nav className="flex-column gap-1">
          <NavLink to="/parameters" className={({ isActive }) => navLinkClass(isActive)}>
            <span className="app-sidebar__icon">⚙️</span>
            <span>Parameters</span>
          </NavLink>

          <NavLink to="/testing" className={({ isActive }) => navLinkClass(isActive)}>
            <span className="app-sidebar__icon">🧪</span>
            <span>Testing</span>
          </NavLink>

          <NavLink to="/validation" className={({ isActive }) => navLinkClass(isActive)}>
            <span className="app-sidebar__icon">✅</span>
            <span>Validation</span>
          </NavLink>
        </Nav>
      </div>

      <div className="app-sidebar__footer mt-auto">
        <Button
          variant="outline-light"
          className="app-sidebar__logout w-100"
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </div>
    </aside>
  );
}

function navLinkClass(isActive) {
  return `app-sidebar__link ${isActive ? "is-active" : ""}`;
}

/* ---------------- Top Header ---------------- */

export function DashboardHeader({ title }) {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const userString = localStorage.getItem("user");

    if (userString) {
      try {
        const userObject = JSON.parse(userString);
        setUserName(userObject.name || "");
      } catch (error) {
        setUserName(userString);
      }
    }
  }, []);

  const initial = (userName?.[0] || "U").toUpperCase();

  return (
    <header className="app-header d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-3">
        <div>
          <h4 className="app-header__title mb-0">{title}</h4>
        </div>

        <div className="app-header__divider" />

        <Badge className="app-header__status rounded-pill">
          <span className="app-header__status-dot" />
          <span>System Online</span>
        </Badge>
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="text-end">
          <div className="app-header__user-name">{userName || "User"}</div>
        </div>

        <div className="app-header__avatar d-flex align-items-center justify-content-center">
          {initial}
        </div>
      </div>
    </header>
  );
}