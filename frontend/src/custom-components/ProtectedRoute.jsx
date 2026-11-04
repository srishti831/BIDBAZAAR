import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Spinner from "./Spinner";

// Waits for the initial "who am I?" request before deciding, so refreshing a
// protected page doesn't bounce you away. Sends guests to log in and back again.
const ProtectedRoute = ({ roles, children }) => {
  const location = useLocation();
  const { isAuthenticated, authChecked, user } = useSelector((s) => s.user);

  if (!authChecked) return <Spinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
