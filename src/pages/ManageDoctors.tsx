import React, { useEffect, useState } from "react";
import "../assets/css/managepatients.css"; // reuse same CSS
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import supabase from "../supabaseClient";

interface Doctor {
  id: number;
  name: string;
  specialization?: string;
  phone_number?: string;
  address?: string;
  gender?: string;
  user_id?: string | null;
  users?: { email: string };
}

interface DoctorFormData extends Partial<Doctor> {
  email?: string;
}

const ManageDoctors: React.FC = () => {
  const [activePage, setActivePage] = useState("Manage Doctors");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({
    name: "",
    specialization: "",
    phone_number: "",
    address: "",
    gender: "",
    email: "",
  });

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  // ✅ Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*, users:user_id(email)");
      if (error) console.error("Error fetching doctors:", error);
      else setDoctors(data || []);
    };
    fetchDoctors();
  }, []);

// ✅ Add new doctor (clean + updated for no admin_id)
const handleAddDoctor = async (formData: any) => {
  try {
    if (!formData.name?.trim()) {
      alert("⚠️ Please enter the doctor's name.");
      return;
    }

    const email =
      formData.email ||
      `${formData.name.replace(/\s+/g, "").toLowerCase()}@tempmail.com`;
    const defaultPassword = "123456";

    // 🧩 Check if user already exists
    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle(); // safer than .single()

    if (existingError) throw existingError;

    if (existingUser) {
      alert("⚠️ This email is already registered.");
      return;
    }

    // 🧩 Create a new user account in 'users' table
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert([
        {
          email,
          username: formData.name.replace(/\s+/g, "").toLowerCase(),
          full_name: formData.name,
          password: defaultPassword,
          role: "doctor",
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    // 🧩 Insert doctor into 'doctors' table
    const { data: newDoctor, error: doctorError } = await supabase
      .from("doctors")
      .insert([
        {
          name: formData.name,
          specialization: formData.specialization,
          phone_number: formData.phone_number,
          address: formData.address,
          gender: formData.gender,
          user_id: newUser.id, // ✅ only this reference
        },
      ])
      .select("*, users:user_id(email)")
      .single();

    if (doctorError) throw doctorError;

    // ✅ Update local state
    setDoctors((prev) => [...prev, newDoctor]);
    resetForm();

    // ✅ Show credentials modal
    setGeneratedCredentials({
      name: formData.name,
      email,
      password: defaultPassword,
    });
    setShowCredentialsModal(true);
  } catch (error: any) {
    console.error("❌ Error adding doctor:", error);
    alert("❌ Failed to add doctor. Check console for details.");
  }
};


  // ✅ Update doctor
  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;

    try {
      let userId = editingDoctor.user_id;

      if (!userId && formData.email) {
        const defaultPassword = "123456";
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([
            {
              email: formData.email,
              password: defaultPassword,
              role: "doctor",
            },
          ])
          .select()
          .single();
        if (userError) throw userError;
        userId = newUser.id;
      }

      const { data, error } = await supabase
        .from("doctors")
        .update({
          name: formData.name,
          specialization: formData.specialization,
          phone_number: formData.phone_number,
          address: formData.address,
          gender: formData.gender,
          user_id: userId,
        })
        .eq("id", editingDoctor.id)
        .select("*, users:user_id(email)")
        .single();

      if (error) throw error;

      setDoctors(doctors.map((d) => (d.id === editingDoctor.id ? data : d)));
      resetForm();
    } catch (err: any) {
      alert("Error updating doctor: " + err.message);
    }
  };

  // ✅ Delete doctor
  const handleDeleteDoctor = async (id: number) => {
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) {
      alert("Error deleting doctor: " + error.message);
      return;
    }
    setDoctors(doctors.filter((d) => d.id !== id));
  };

  const openAddForm = () => {
    setEditingDoctor(null);
    setFormData({
      name: "",
      specialization: "",
      phone_number: "",
      address: "",
      gender: "",
      email: "",
    });
    setShowForm(true);
  };

  const openEditForm = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      ...doctor,
      email: doctor.users?.email || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      specialization: "",
      phone_number: "",
      address: "",
      gender: "",
      email: "",
    });
    setEditingDoctor(null);
    setShowForm(false);
  };

  const filteredDoctors = doctors.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} onSearch={setSearchQuery} />

        <div className="page-content">
          <h2>Manage Doctors</h2>
          <button className="add-patient-btn" onClick={openAddForm}>
            Add Doctor
          </button>

          <table className="patients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>{doctor.name}</td>
                  <td>{doctor.specialization || "—"}</td>
                  <td>{doctor.phone_number || "—"}</td>
                  <td>{doctor.gender || "—"}</td>
                  <td>
                    <button className="edit-btn" onClick={() => openEditForm(doctor)}>
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteDoctor(doctor.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</h3>

            <input
              type="text"
              placeholder="Doctor Name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <input
              type="text"
              placeholder="Specialization"
              value={formData.specialization || ""}
              onChange={(e) =>
                setFormData({ ...formData, specialization: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phone_number || ""}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />

            {/* Gender Dropdown */}
            <select
              value={formData.gender || ""}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <input
              type="text"
              placeholder="Address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <div className="modal-actions">
              {editingDoctor ? (
                <button className="save-btn" onClick={handleUpdateDoctor}>
                  Update
                </button>
              ) : (
                <button className="save-btn" onClick={() => handleAddDoctor(formData)}>
                  Save
                </button>
              )}
              <button className="cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATED CREDENTIALS MODAL */}
      {showCredentialsModal && generatedCredentials && (
        <div className="modal-overlay">
          <div className="modal-content credentials-modal">
            <h3>🩺 Doctor Account Created Successfully!</h3>
            <p>
              <strong>Name:</strong> {generatedCredentials.name}
            </p>
            <p>
              <strong>Email:</strong> {generatedCredentials.email}
            </p>
            <p>
              <strong>Temporary Password:</strong> {generatedCredentials.password}
            </p>

            <p className="note">
              Please provide these credentials to the doctor so they can log in.
            </p>

            <div className="modal-actions">
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`
                  );
                  alert("✅ Credentials copied to clipboard!");
                }}
              >
                Copy Credentials
              </button>

              <button
                className="close-btn"
                onClick={() => setShowCredentialsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDoctors;
