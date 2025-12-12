import React, { useState, useEffect } from "react";
import "../assets/css/managepatients.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import supabase from "../supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import bcrypt from "bcryptjs";

// Interfaces
interface Patient {
  id: number;
  name: string;
  first_name?: string;
  middle_name?: string | null;
  username?: string | null;
  last_name?: string;
  age?: number;
  date_of_birth?: string;
  address?: string;
  phone_number?: string;
  condition: string;
  doctor_id?: string;
  user_id?: string | null;
  gender: string;
  doctors?: { full_name: string };
  users?: { email: string };
}

interface Doctor {
  id: string;
  full_name: string;
}

interface PatientFormData extends Partial<Patient> {
  email?: string;
  password?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
}

// Main Component
const ManagePatients: React.FC = () => {
  const [activePage, setActivePage] = useState("Manage Patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    username: "",
    age: undefined,
    gender: "",
    date_of_birth: "",
    street: "",
    barangay: "",
    city: "",
    province: "Laguna",
    phone_number: "",
    condition: "",
    doctor_id: "",
    email: "",
    password: "",
  });
  const [selectedDob, setSelectedDob] = useState<Date | null>(null);
  const [lagunaData, setLagunaData] = useState<Record<string, string[]>>({});

  // Fetch Laguna barangays JSON
  useEffect(() => {
    fetch("/laguna-barangays.json")
      .then((res) => res.json())
      .then((data) => setLagunaData(data))
      .catch((err) => console.error("Error loading barangays:", err));
  }, []);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*, doctors(full_name), users(email)")
        .eq("is_archived", false)
        .order("name", { ascending: true });

      if (error) console.error(error);
      else setPatients(data || []);
    };
    fetchPatients();
  }, []);

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from("doctors").select("id, full_name");
      if (error) console.error(error);
      setDoctors(data || []);
    };
    fetchDoctors();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      first_name: "",
      middle_name: "",
      last_name: "",
      age: undefined,
      gender: "",
      date_of_birth: "",
      street: "",
      barangay: "",
      city: "",
      province: "Laguna",
      phone_number: "",
      condition: "",
      doctor_id: "",
      email: "",
      password: "",
    });
    setEditingPatient(null);
    setShowForm(false);
    setSelectedDob(null);
  };

  // Generate random password
  const generatePassword = (length = 8) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  // Combine address
  const combineAddress = (street?: string, barangay?: string, city?: string, province?: string) =>
    [street, barangay, city, province].filter(Boolean).join(", ");

  // Save patient
  const handleSavePatient = async () => {
  try {
    const { first_name, middle_name, last_name, street, barangay, city, province } = formData;
    if (!first_name?.trim() || !last_name?.trim()) {
      alert("⚠️ Please enter the patient's first and last name.");
      return;
    }

    const fullName = `${first_name} ${middle_name || ""} ${last_name}`.trim();
    const fullAddress = combineAddress(street, barangay, city, province);

    if (editingPatient) {
      // ✅ Update existing patient
      const { error } = await supabase
        .from("patients")
        .update({
          name: fullName,
          age: formData.age,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          address: fullAddress,
          phone_number: formData.phone_number,
          condition: formData.condition,
          doctor_id: formData.doctor_id || null,
        })
        .eq("id", editingPatient.id);

      if (error) throw error;

      setPatients((prev) =>
        prev.map((p) =>
          p.id === editingPatient.id
            ? { ...p, name: fullName, address: fullAddress, ...formData }
            : p
        )
      );
      alert("✅ Patient updated successfully!");
    } else {
      // ✅ Add new patient
      const email =
        formData.email ||
        `${first_name.toLowerCase()}${last_name.toLowerCase()}@gmail.com`;

      const rawPassword = generatePassword();
      const hashedPassword = bcrypt.hashSync(rawPassword, 10); // 🔑 Hash the password

      const username =
        fullName.replace(/\s+/g, "").toLowerCase() +
        Math.floor(Math.random() * 1000);

      // Insert into users table with hashed password
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([{ username, email, password: hashedPassword, role: "patient" }])
        .select()
        .single();
      if (userError) throw userError;

      // Insert into patients table
      const { data: newPatient, error: insertError } = await supabase
        .from("patients")
        .insert([
          {
            name: fullName,
            age: formData.age,
            gender: formData.gender,
            date_of_birth: formData.date_of_birth,
            address: fullAddress,
            phone_number: formData.phone_number,
            condition: formData.condition,
            doctor_id: formData.doctor_id || null,
            user_id: userData.id,
            is_archived: false,
          },
        ])
        .select("*, doctors(full_name), users(email)")
        .single();
      if (insertError) throw insertError;

      // Notification for doctor
      if (formData.doctor_id) {
        await supabase.from("notifications").insert([
          {
            doctor_id: formData.doctor_id,
            patient_id: newPatient.id,
            message: `A new patient has been assigned: ${fullName}`,
            is_read: false,
          },
        ]);
      }

      // Alert admin with raw password
      alert(
        `✅ Patient added successfully!\n📧 Email: ${email}\n👤 Username: ${username}\n🔑 Password: ${rawPassword}`
      );

      setPatients((prev) =>
        [...prev, newPatient].sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    resetForm();
  } catch (error: any) {
    console.error("Error saving patient:", error.message);
    alert("❌ Failed to save patient.");
  }
};


  // Archive patient
  const handleArchivePatient = async (patientId: number) => {
    if (!window.confirm("Are you sure you want to archive this patient?")) return;

    try {
      const { error } = await supabase
        .from("patients")
        .update({ is_archived: true })
        .eq("id", patientId);
      if (error) throw error;

      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      alert("✅ Patient successfully archived!");
    } catch (error: any) {
      console.error("Error archiving patient:", error.message);
      alert("❌ Failed to archive patient.");
    }
  };

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = filterCondition ? p.condition === filterCondition : true;
    const matchesDoctor = filterDoctor ? p.doctor_id === filterDoctor : true;
    return matchesSearch && matchesCondition && matchesDoctor;
  });

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} onSearch={setSearchQuery} />
        <div className="page-content">
          <h2>Manage Patients</h2>

          {/* Filters */}
          <div className="filters-container">
            <button className="add-patient-btn" onClick={() => setShowForm(true)}>
              Add Patient
            </button>

            <div className="filter-group">
              <label htmlFor="diabetesFilter">Filter by Diabetic Type:</label>
              <select
                id="diabetesFilter"
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Type 1 Diabetes">Type 1 Diabetes</option>
                <option value="Type 2 Diabetes">Type 2 Diabetes</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="doctorFilter">Filter by Doctor:</label>
              <select
                id="doctorFilter"
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <table className="patients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>UserName</th>
                <th>Sex</th>
                <th>Email</th>
                <th>Condition</th>
                <th>Doctor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.name}</td>
                  <td>{patient.username || "—"}</td>
                  <td>{patient.gender || "—"}</td>
                  <td>{patient.users?.email || "N/A"}</td>
                  <td>{patient.condition}</td>
                  <td>{patient.doctors?.full_name || "No doctor assigned"}</td>
                  <td>
                    <button className="view-btn" onClick={() => setViewingPatient(patient)}>
                      View
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => {
                        const [first, middle, last] = (patient.name || "").split(" ");
                        const [street = "", barangay = "", city = "", province = ""] =
                          (patient.address || "").split(",").map((s) => s.trim());
                        setEditingPatient(patient);
                        setFormData({
                          ...patient,
                          first_name: first || "",
                          middle_name: middle || "",
                          last_name: last || "",
                          street,
                          barangay,
                          city,
                          province,
                          email: patient.users?.email || "",
                        });
                        setSelectedDob(patient.date_of_birth ? new Date(patient.date_of_birth) : null);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="archive-btn" onClick={() => handleArchivePatient(patient.id)}>
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingPatient ? "Edit Patient" : "Add Patient"}</h3>

            <div className="name-fields">
              <label>First Name:</label>
              <input
                type="text"
                placeholder="First Name"
                value={formData.first_name || ""}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <label>Middle Name (optional):</label>
              <input
                type="text"
                placeholder="Middle Name (Optional)"
                value={formData.middle_name || ""}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
              <label>Last Name:</label>
              <input
                type="text"
                placeholder="Last Name"
                value={formData.last_name || ""}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
            <label>Email Address:</label>
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingPatient}
            />
            <label>Age:</label>
            <input
              type="number"
              placeholder="Age"
              value={formData.age || ""}
              onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
            />
          <label>Gender:</label>
            <select
              value={formData.gender || ""}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <label>Date of Birth:</label>
            <DatePicker
              selected={selectedDob}
              onChange={(date) => {
                setSelectedDob(date);
                setFormData({ ...formData, date_of_birth: date?.toISOString().split("T")[0] });
              }}
              onChangeRaw={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, date_of_birth: e.target.value });
              }}
              placeholderText="Select Date of Birth (YYYY-MM-DD)"
              className="dob-input"
              dateFormat="yyyy-MM-dd"
              isClearable
            />

            {/* Address Fields */}
            <div className="address-fields">
              <label>Street / House No.:</label>
              <input
                type="text"
                placeholder="Street / House No."
                value={formData.street || ""}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />

              <label>City / Municipality:</label>
              <select
                value={formData.city || ""}
                onChange={(e) => {
                  const city = e.target.value;
                  setFormData({ ...formData, city, barangay: "" });
                }}
              >
                <option value="">Select City</option>
                {Object.keys(lagunaData).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <label>Barangay:</label>
              <select
                value={formData.barangay || ""}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                disabled={!formData.city}
              >
                <option value="">Select Barangay</option>
                {formData.city &&
                  lagunaData[formData.city]?.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
              </select>

              <label>Province / Region:</label>
              <select
                value={formData.province || "Laguna"}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              >
                <option value="Laguna">Laguna</option>
              </select>
            </div>

            <label>Phone Number:</label>
            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phone_number || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) setFormData({ ...formData, phone_number: value });
              }}
              maxLength={11}
            />
            <label>Diabetic Condition:</label>
            <select
              value={formData.condition || ""}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="">Select Condition</option>
              <option value="Type 1 Diabetes">Type 1 Diabetes</option>
              <option value="Type 2 Diabetes">Type 2 Diabetes</option>
            </select>
            
            <label>Assign Doctor:</label>
            <select
              value={formData.doctor_id || ""}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
            >
              <option value="">Assign Doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.full_name}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="save-btn" onClick={handleSavePatient}>
                {editingPatient ? "Save Changes" : "Add Patient"}
              </button>
              <button className="cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingPatient && (
        <div className="modal view-modal">
          <div className="modal-content">
            <h3>Patient Details</h3>
            <div className="patient-card">
              <p>
                <strong>Name:</strong> {viewingPatient.name}
              </p>
              <p>
                <strong>Email:</strong> {viewingPatient.users?.email || "—"}
              </p>
              <p>
                <strong>Condition:</strong> {viewingPatient.condition}
              </p>
              <p>
                <strong>Doctor:</strong> {viewingPatient.doctors?.full_name || "—"}
              </p>
              <p>
                <strong>Address:</strong> {viewingPatient.address || "—"}
              </p>
              <p>
                <strong>Phone:</strong> {viewingPatient.phone_number || "—"}
              </p>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setViewingPatient(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePatients;
