import React, { useState, useEffect } from "react";
import "../assets/css/settings.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import {FaEye, FaEyeSlash} from 'react-icons/fa';
import supabase from "../supabaseClient";

const Settings: React.FC = () => {
  const [activePage, setActivePage] = useState("settings");

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

    // Toggle password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

   // ✅ Fetch current admin profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      const storedEmail = localStorage.getItem("adminEmail");

      if (!storedEmail) return;

      const { data, error } = await supabase
        .from("users")
        .select("username, full_name, email")
        .eq("email", storedEmail)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setEmail(data.email || "");
      }
    };

    fetchProfile();
  }, []);

  const handleSaveChanges = async () => {
    if (!username || !fullName || !email || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const storedEmail = localStorage.getItem("adminEmail");
    if (!storedEmail) {
      alert("No logged-in admin found!");
      return;
    }

    // ✅ Update sa Supabase
    const { data, error } = await supabase
      .from("users")
      .update({
        username: username,
        full_name: fullName,
        email: email,
        password: password, // ⚠️ NOTE: Mas okay kung hashed password ito
      })
      .eq("email", storedEmail)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update account settings.");
      return;
    }

    // ✅ Update localStorage din para consistent
    localStorage.setItem("adminEmail", email);

    alert("Account settings updated successfully!");
    console.log("Updated user:", data);
  };

   return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="main-content">
        <Topbar activePage={activePage} />

        <div className="page-content">
          <h2>Account Settings</h2>

          {/* Username */}
          <div className="settings-item">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>

          {/* Full Name */}
          <div className="settings-item">
            <label>Full Name:</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div className="settings-item">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          {/* New Password */}
          <div className="settings-item">
            <label>New Password:</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="settings-item">
            <label>Confirm Password:</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button className="save-settings-btn" onClick={handleSaveChanges}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;