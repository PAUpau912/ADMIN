import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../assets/css/sidebar.css';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const navigate = useNavigate();

const handleLogout = () => {
  // tanggalin lahat ng tokens/session
  localStorage.removeItem("isAuthenticated");
  localStorage.clear();
  sessionStorage.clear();

  // redirect to login/start page at i-replace history
  navigate("/", { replace: true });
};



  return (
    <div className="sidebar">
      <div>
        <img src="src/assets/images.png" alt="App Logo" className="sidebar-logo" />
        <h3>SPC Medical</h3>
        <ul className="sidebar-menu">
          <li
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => {
              setActivePage("dashboard");
              navigate("/dashboard");
            }}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </li>

          <li
            className={activePage === "Manage Patients" ? "active" : ""}
            onClick={() => {
              setActivePage("Manage Patients");
              navigate("/manage-patients");
            }}
          >
            <i className="fas fa-user-injured"></i>
            <span>Manage Patients</span>
          </li>

          <li
            className={activePage === "Manage Doctors" ? "active" : ""}
            onClick={() => {
              setActivePage("Manage Doctors");
              navigate("/manage-doctors");
            }}
          >
            <i className="fas fa-file-medical"></i>
            <span>Manage Doctors</span>
          </li>

          <li
            className={activePage === "Reports" ? "active" : ""}
            onClick={() => {
              setActivePage("Reports");
              navigate("/reports");
            }}
          >
            <i className="fas fa-file-alt"></i>
            <span>Reports</span>
          </li>

          <li
            className={activePage === "Settings" ? "active" : ""}
            onClick={() => {
              setActivePage("Settings");
              navigate("/settings");
            }}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </li>

        </ul>
      </div>

      {/* 🔴 Logout button sa baba */}
      <div className="sidebar-logout">
        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
