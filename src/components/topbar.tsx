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
  onSearch?: (query: string) => void;
}

const Topbar: React.FC<TopbarProps> = ({ activePage, onSearch }) => {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const email = localStorage.getItem("adminEmail");
        if (!email) {
          navigate("/login");
          return;
        }

        // ✅ Fetch admin user info
        const { data, error } = await supabase
          .from("users")
          .select("id, email, username, full_name")
          .eq("email", email)
          .single();

        if (error || !data) {
          console.error("Error fetching profile:", error);
          return;
        }

        setAdminProfile(data);

        // ✅ Check if avatar file exists
        const extensions = ["jpg", "jpeg", "png", "JPG"];
        let foundUrl: string | null = null;

        for (const ext of extensions) {
          const filePath = `avatars/${data.id}.${ext}`;
          const { data: publicUrlData } = supabase.storage
            .from("profile_pictures")
            .getPublicUrl(filePath);

          const { data: fileBlob, error: listError } = await supabase.storage
            .from("profile_pictures")
            .download(filePath);

          if (!listError && fileBlob) {
            foundUrl = publicUrlData.publicUrl;
            break;
          }
        }

        setProfileUrl(foundUrl);
      } catch (err) {
        console.error("❌ Fetch admin profile failed:", err);
      }
    };

    fetchAdminProfile();
  }, [navigate]);

  const displayName =
    adminProfile?.username ||
    adminProfile?.full_name ||
    adminProfile?.email ||
    "Admin";

  const profileImage = profileUrl || "/default-avatars.png";

  return (
    <div className="topbar-content">
      {/* ✅ DASHBOARD */}
      {activePage === "dashboard" && (
        <div className="topbar-center dashboard">
          <h3>
            Welcome, <span className="admin-name">{displayName}</span>
          </h3>
          <div className="profile">
            <img
              src={profileImage}
              alt="Profile"
              className="topbar-profile"
              onError={(e) => {
                e.currentTarget.src = "/default-avatars.png";
              }}
            />
          </div>
        </div>
      )}

      {/* ✅ PATIENTS */}
      {activePage === "Manage Patients" && (
        <div className="topbar-center patients">
          <h3>Patients List</h3>
          <div className="topbar-actions">
            <div className="search-bar">
              <span className="search-icon">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search patients..."
                className="search-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ DOCTORS */}
      {activePage === "Manage Doctors" && (
        <div className="topbar-center doctors">
          <h3>Doctor's List</h3>
          <div className="topbar-actions">
            <div className="search-bar">
              <span className="search-icon">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search doctors..."
                className="search-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ REPORTS */}
      {activePage === "Reports" && (
        <div className="topbar-center">
          <h3>Reports Overview</h3>
        </div>
      )}

      {/* ✅ SETTINGS */}
      {activePage === "settings" && (
        <div className="topbar-center">
          <h3>Settings</h3>
        </div>
      )}

            {/* ✅ SETTINGS */}
      {activePage === "Archive" && (
        <div className="topbar-center">
          <h3>Archive</h3>
        </div>
      )}
    </div>
  );
};

export default Topbar;
