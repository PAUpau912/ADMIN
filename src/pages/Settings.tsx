import React, { useState, useEffect } from "react";
import "../assets/css/settings.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import { FaEye, FaEyeSlash, FaCamera } from "react-icons/fa";
import supabase from "../supabaseClient";
import bcrypt from "bcryptjs";

const Settings: React.FC = () => {
  // ✅ Separate fields for name parts
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [activePage, setActivePage] = useState("settings");

  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileUrl, setProfileUrl] = useState<string>("");
  const [newProfileFile, setNewProfileFile] = useState<File | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Fetch current admin profile
  useEffect(() => {
    const fetchProfile = async () => {
      const storedEmail = localStorage.getItem("adminEmail");
      if (!storedEmail) return;

      const { data, error } = await supabase
        .from("users")
        .select("id, username, full_name, email")
        .eq("email", storedEmail.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setUserId(data.id);
        setUsername(data.username || "");
        setEmail(data.email || "");

        // ✅ Split full_name into parts if available
        if (data.full_name) {
          const nameParts = data.full_name.split(" ");
          setFirstName(nameParts[0] || "");
          setMiddleName(
            nameParts.length === 3 ? nameParts[1] : nameParts.length > 3 ? nameParts.slice(1, -1).join(" ") : ""
          );
          setLastName(nameParts[nameParts.length - 1] || "");
        }

        // ✅ Load existing profile picture if exists in storage
        const extensions = ["jpg", "jpeg", "png"];
        for (const ext of extensions) {
          const { data: urlData } = supabase.storage
            .from("profile_pictures")
            .getPublicUrl(`avatars/${data.id}.${ext}`);
          const { data: fileList } = await supabase.storage
            .from("profile_pictures")
            .list("avatars", { search: `${data.id}.${ext}` });
          if (fileList && fileList.length > 0) {
            setProfileUrl(urlData.publicUrl);
            break;
          }
        }
      }
    };

    fetchProfile();
  }, []);

  // ✅ Upload profile picture to Supabase Storage
  const handleUploadProfile = async () => {
    if (!newProfileFile || !userId) return profileUrl;

    const fileExt = newProfileFile.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png"].includes(fileExt || "")) {
      alert("Only JPG, JPEG, and PNG formats are allowed.");
      return profileUrl;
    }

    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_pictures")
      .upload(filePath, newProfileFile, { upsert: true });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      alert("Failed to upload profile picture.");
      return profileUrl;
    }

    // ✅ Get the new public URL
    const { data: publicUrlData } = supabase.storage
      .from("profile_pictures")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  // ✅ Save changes
  const handleSaveChanges = async () => {
  if (!firstName || !lastName || !username || !email) {
    alert("Please fill in all required fields.");
    return;
  }

  // ✅ Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address (e.g., example@gmail.com).");
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

  // ✅ Combine full name
  const fullName = [firstName, middleName, lastName]
    .filter((part) => part.trim() !== "")
    .join(" ");

  // ✅ Upload profile picture
  const uploadedProfileUrl = await handleUploadProfile();

  const updateData: any = {
    username,
    full_name: fullName,
    email,
  };

  // 🔑 Hash password if user entered a new one
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    updateData.password = hashedPassword;
  }

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("email", storedEmail);

  if (error) {
    console.error("Error updating profile:", error);
    alert("Failed to update account settings.");
    return;
  }

  localStorage.setItem("adminEmail", email);
  setProfileUrl(uploadedProfileUrl);
  setNewProfileFile(null);

  alert("✅ Account settings updated successfully!");
};

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewProfileFile(file);
      setProfileUrl(URL.createObjectURL(file)); // instant preview
    }
  };

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} />

        <div className="page-content">
          <h2>Account Settings</h2>

          {/* ✅ Profile Picture Section */}
          <div className="profile-section">
            <div className="profile-pic-wrapper">
              <div className="profile-pic-container">
                <img
                  src={profileUrl || "/default-avatars.png"}
                  alt="Profile"
                  className="profile-pic"
                />
                <label htmlFor="uploadProfile" className="upload-overlay">
                  <FaCamera className="camera-icon" />
                </label>
                <input
                  id="uploadProfile"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  style={{ display: "none" }}
                  onChange={handleProfileChange}
                />
              </div>
              <p className="profile-text">Upload Profile Photo</p>
            </div>
          </div>

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

          {/* ✅ Separate Name Fields */}
          <div className="name-row">
            <div className="settings-item">
              <label>First Name:</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="settings-item">
              <label>Middle Name (optional):</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Enter your middle name"
              />
            </div>
            <div className="settings-item">
              <label>Last Name:</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
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

          {/* Password */}
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
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
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
