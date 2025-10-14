import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import "../assets/css/topbar.css";

interface AdminProfile {
  id?: string;
  username: string;
  full_name: string;
  email: string;
}

interface TopbarProps {
  activePage: string;
  onSearch?: (query: string) => void; // ✅ callback para sa search
}

const Topbar: React.FC<TopbarProps> = ({ activePage, onSearch }) => {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const email = localStorage.getItem("adminEmail");

        if (!email) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("id,email,username,full_name")
          .eq("email", email)
          .limit(1);

        if (error) return;

        if (data && data.length > 0) {
          setAdminProfile(data[0]);
        } else {
          setAdminProfile({
            email,
            username: "",
            full_name: "",
          });
        }
      } catch (err) {
        console.error("❌ Fetch admin profile failed:", err);
      }
    };

    fetchAdminProfile();
  }, [navigate]);

  // ✅ fallback name logic
  const displayName =
    adminProfile?.username ||
    adminProfile?.full_name ||
    adminProfile?.email ||
    localStorage.getItem("adminEmail") ||
    "Admin";

  return (
    <div className="topbar-content">
      {/* Dashboard Page */}
      {activePage === "dashboard" && (
        <div className="topbar-center dashboard">
          <h3>
            Welcome, <span className="admin-name">{displayName}</span>
          </h3>
          <div className="profile">
            <img src="/doctor.jpg" alt="Profile" />
          </div>
        </div>
      )}

      {/* Manage Patients Page */}
      {activePage === "Manage Patients" && (
        <div className="topbar-center patients">
          <h3>Patients List</h3>
          <div className="search-bar">
            <span className="search-icon">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              onChange={(e) => onSearch?.(e.target.value)} // 🔑 ipapasa sa parent
              placeholder="Search patients..."
              className="search-input"
            />
          </div>
        </div>
      )}

      {/* Manage Doctors Page */}
      {activePage === "Manage Doctors" && (
        <div className="topbar-center doctors">
          <h3>Doctor's List</h3>
          <div className="search-bar">
            <span className="search-icon">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              onChange={(e) => onSearch?.(e.target.value)} // 🔑 ipapasa sa parent
              placeholder="Search doctors..."
              className="search-input"
            />
          </div>
        </div>
      )}

      {/* Reports Page */}
      {activePage === "Reports" && (
        <div className="topbar-center">
          <h3>Reports Overview</h3>
        </div>
      )}

      {/* Settings Page */}
      {activePage === "settings" && (
        <div className="topbar-center">
          <h3>Settings</h3>
        </div>
      )}
    </div>
  );
};

export default Topbar;
