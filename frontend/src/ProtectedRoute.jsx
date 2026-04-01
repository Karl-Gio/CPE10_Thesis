import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // not logged in → redirect to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}