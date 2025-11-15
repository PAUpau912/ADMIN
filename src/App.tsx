import { Routes, Route } from "react-router-dom";
import Home from "./pages/start";
import Dashboard from "./pages/dashboard";
import ManagePatients from "./pages/ManagePatients";
import ManageDoctors from "./pages/ManageDoctors";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRRoute";
import Archive from "./pages/Archive"; // simplified path
import ForgotPassword from "./pages/forgotpassword";
import ResetPassword from "./pages/resetpassword";

function App() {
  return (
    <Routes>
      {/* Public page */}
      <Route path="/" element={<Home />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Protected pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-patients"
        element={
          <ProtectedRoute>
            <ManagePatients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-doctors"
        element={
          <ProtectedRoute>
            <ManageDoctors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* 🟢 ARCHIVE PAGE */}
      <Route
        path="/archive"
        element={
          <ProtectedRoute>
            <Archive />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
