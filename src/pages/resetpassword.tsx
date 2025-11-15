import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import logo from "../assets/images.png";
import "../assets/css/home.css";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🛡️ Check passwords match
    if (newPassword !== confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }

    // 🧾 Get user id from localStorage (set in ForgotPassword)
    const userId = localStorage.getItem("reset_user_id");
    if (!userId) {
      alert("⚠️ No user found. Please verify your email again.");
      navigate("/forgot-password");
      return;
    }

    // 🟢 Update password in users table
    const { error } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", userId);

    if (error) {
      console.error("Error updating password:", error);
      alert("❌ Failed to reset password. Try again.");
      return;
    }

    // 🧹 Clean up + redirect
    localStorage.removeItem("reset_user_id");
    alert("✅ Password reset successfully!");
    navigate("/");
  };

  return (
    <div className="StartPage">
      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          <img src={logo} alt="Logo" className="Logo mb-3 d-block mx-auto" />
          <h3 className="text-center">Reset Your Password</h3>

          <form onSubmit={handleReset}>
            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type="password"
                placeholder="New Password"
                className="InputField form-control ps-5"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type="password"
                placeholder="Confirm Password"
                className="InputField form-control ps-5"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="LoginButton btn w-100">
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
