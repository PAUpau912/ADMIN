import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../assets/css/sidebar.css';

interface SidebarProps {
  activePage?: string;
  setActivePage?: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage = "", setActivePage }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.clear();
    sessionStorage.clear();

    navigate("/", { replace: true });
  };

  // Helper function para safe kahit wala setActivePage
  const handleNav = (page: string, path: string) => {
    if (setActivePage) setActivePage(page);
    navigate(path);
  };

  return (
    <div className="sidebar">
      <div>
        <img src="/src/assets/images.png" alt="App Logo" className="sidebar-logo" />
        <h3>SPC Medical</h3>

        <ul className="sidebar-menu">
          <li
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => handleNav("dashboard", "/dashboard")}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </li>

          <li
            className={activePage === "Manage Patients" ? "active" : ""}
            onClick={() => handleNav("Manage Patients", "/manage-patients")}
          >
            <i className="fas fa-user-injured"></i>
            <span>Manage Patients</span>
          </li>

          <li
            className={activePage === "Manage Doctors" ? "active" : ""}
            onClick={() => handleNav("Manage Doctors", "/manage-doctors")}
          >
            <i className="fas fa-file-medical"></i>
            <span>Manage Doctors</span>
          </li>

          <li
            className={activePage === "Reports" ? "active" : ""}
            onClick={() => handleNav("Reports", "/reports")}
          >
            <i className="fas fa-file-alt"></i>
            <span>Reports</span>
          </li>

          <li
            className={activePage === "Settings" ? "active" : ""}
            onClick={() => handleNav("Settings", "/settings")}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </li>

          <li
            className={activePage === "Archive" ? "active" : ""}
            onClick={() => handleNav("Archive", "/archive")}
          >
            <i className="fas fa-archive"></i>
            <span>Archive</span>
          </li>
        </ul>
      </div>

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

