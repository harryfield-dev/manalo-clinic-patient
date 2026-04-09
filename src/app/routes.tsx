import { createBrowserRouter, Navigate } from "react-router";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { BookAppointment } from "./pages/BookAppointment";
import { Appointments } from "./pages/Appointments";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { ClinicMap } from "./pages/ClinicMap";
import { Chat } from "./pages/Chat";
import { useApp } from "./context/AppContext";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/login", element: <PublicRoute><Login /></PublicRoute> },
  { path: "/register", element: <PublicRoute><Register /></PublicRoute> },
  { path: "/dashboard", element: <PrivateRoute><Dashboard /></PrivateRoute> },
  { path: "/book", element: <PrivateRoute><BookAppointment /></PrivateRoute> },
  { path: "/appointments", element: <PrivateRoute><Appointments /></PrivateRoute> },
  { path: "/notifications", element: <PrivateRoute><Notifications /></PrivateRoute> },
  { path: "/profile", element: <PrivateRoute><Profile /></PrivateRoute> },
  { path: "/map", element: <PrivateRoute><ClinicMap /></PrivateRoute> },
  { path: "/chat", element: <PrivateRoute><Chat /></PrivateRoute> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
