// src/pages/start.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/home.css";
import logo from "../assets/images.png";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import supabase from "../supabaseClient";
import bcrypt from "bcryptjs"; // ✅ fixed import

const Home = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const isMobile = window.matchMedia("(max-width: 767.98px)").matches;

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const handleSwitch = () => setIsSignUp((prev) => !prev);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isSignUp) {
        // ✅ Sign Up (Admin account only)
        if (password !== confirmPassword) {
          alert("❌ Passwords do not match");
          return;
        }

        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .or(`email.eq.${email},username.eq.${username}`)
          .maybeSingle();

        if (existingUser) {
          alert("❌ Email or username already exists.");
          return;
        }

        // 🔑 Hash the password before inserting
        const hashedPassword = bcrypt.hashSync(password, 10);

        const { error } = await supabase.from("users").insert([
          {
            full_name: fullName,
            username,
            email,
            password: hashedPassword, // store hashed password
            role: "admin", // 🟢 Admin only signup form
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;

        alert("✅ Admin account created successfully! Please log in.");
        setIsSignUp(false);
      } else {
        // ✅ Login flow with hybrid password check
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (error || !data) {
          alert("❌ Invalid email or password.");
          return;
        }

        let isMatch = false;

        // Check if password is hashed
        if (data.password.startsWith("$2a$") || data.password.startsWith("$2b$")) {
          // ✅ Hashed password
          isMatch = bcrypt.compareSync(password, data.password);
        } else {
          // 🔑 Plain text password (existing user)
          if (password === data.password) {
            isMatch = true;

            // Update the DB with hashed password
            const hashedPassword = bcrypt.hashSync(password, 10);
            await supabase
              .from("users")
              .update({ password: hashedPassword })
              .eq("id", data.id);
          }
        }

        if (!isMatch) {
          alert("❌ Wrong password.");
          return;
        }

        // 🚫 Restrict non-admin login
        if (data.role !== "admin") {
          alert("⚠️ Access denied. Only administrators can log in here.");
          return;
        }

        // ✅ Save admin session info
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user_id", data.id);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("adminEmail", data.email);

        alert(`✅ Welcome back, Admin ${data.full_name || data.username}!`);
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Error:", err.message);
      alert("⚠️ Server error, please try again.");
    }
  };

  return (
    <div
      className={`StartPage${isSignUp && !isMobile ? " reverse" : ""}`}
      style={{ transition: "all 0.5s cubic-bezier(.4,2.3,.3,1)" }}
    >
      {!isMobile && (
        <div className="Left">
          <img src={logo} alt="Logo" className="Logo mb-3" />
          <h2 className="text-center">
            {isSignUp
              ? "Create your SPC Medical Diabetic Admin Account!"
              : "Welcome Admin to SPC Medical Diabetic App!"}
          </h2>
        </div>
      )}

      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          {isMobile && (
            <img src={logo} alt="Logo" className="Logo mb-3 d-block mx-auto" />
          )}
          <h3 className="text-center">
            {isSignUp ? "Admin Sign Up" : "Admin Login"}
          </h3>

          <form className="LoginForm" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <div className="InputRow mb-3 position-relative">
                  <i className="fas fa-user IconOutside"></i>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="InputField form-control ps-5"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="InputRow mb-3 position-relative">
                  <i className="fas fa-user IconOutside"></i>
                  <input
                    type="text"
                    placeholder="Username"
                    className="InputField form-control ps-5"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="InputRow mb-3 position-relative">
                  <i className="fas fa-envelope IconOutside"></i>
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="InputField form-control ps-5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </>
            )}

            {!isSignUp && (
              <div className="InputRow mb-3 position-relative">
                <i className="fas fa-envelope IconOutside"></i>
                <input
                  type="text"
                  placeholder="Email Address"
                  className="InputField form-control ps-5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="InputField form-control ps-5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <i
                className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} TogglePasswordIcon`}
                onClick={togglePasswordVisibility}
                style={{
                  cursor: "pointer",
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              ></i>
            </div>

            {isSignUp && (
              <div className="InputRow mb-3 position-relative">
                <i className="fas fa-lock IconOutside"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="InputField form-control ps-5"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <i
                  className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} TogglePasswordIcon`}
                  onClick={togglePasswordVisibility}
                  style={{
                    cursor: "pointer",
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                ></i>
              </div>
            )}

            {/* Login Button */}
            <button type="submit" className="LoginButton btn w-100">
              {isSignUp ? "Sign Up" : "Login"}
            </button>

            {/* Forgot Password */}
            {!isSignUp && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link p-0"
                  style={{ color: "#007835", textDecoration: "underline" }}
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </form>

          <div className="SignUpLink text-center mt-3">
            {isSignUp ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleSwitch}
                  style={{ color: "#007835", textDecoration: "underline" }}
                >
                  Login
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleSwitch}
                  style={{ color: "#007835", textDecoration: "underline" }}
                >
                  Sign Up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
