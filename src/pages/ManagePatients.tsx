import React, { useState, useEffect } from "react";
import "../assets/css/managepatients.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import supabase from "../supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Patient {
  id: number;
  name: string;
  first_name?: string;
  middle_name?: string | null;
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
  generatedPassword?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
}

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
    age: undefined,
    gender: "",
    date_of_birth: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    phone_number: "",
    condition: "",
    doctor_id: "",
    email: "",
    password: "",
  });
  const [selectedDob, setSelectedDob] = useState<Date | null>(null);

  // ✅ Fetch patients
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

  // ✅ Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name");
      if (error) console.error("Error fetching doctors:", error);
      setDoctors(data || []);
    };
    fetchDoctors();
  }, []);

  // ✅ Reset form
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
      province: "",
      phone_number: "",
      condition: "",
      doctor_id: "",
      email: "",
      password: "",
    });
    setEditingPatient(null);
    setShowForm(false);
  };

  // ✅ Generate random password
  const generatePassword = (length = 8) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  // ✅ Combine address parts into a single string
  const combineAddress = (street?: string, barangay?: string, city?: string, province?: string) => {
    return [street, barangay, city, province].filter(Boolean).join(", ");
  };

  // ✅ Handle Add / Update patient
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
        // Update existing patient
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
            p.id === editingPatient.id ? { ...p, name: fullName, address: fullAddress, ...formData } : p
          )
        );
        alert("✅ Patient updated successfully!");
      } else {
        // Add new patient
        const email =
          formData.email ||
          `${first_name.toLowerCase()}${last_name.toLowerCase()}@gmail.com`;
        const password = generatePassword();
        const username =
          fullName.replace(/\s+/g, "").toLowerCase() +
          Math.floor(Math.random() * 1000);

        // Step 1: insert into users
        const { data: userData, error: userError } = await supabase
          .from("users")
          .insert([{ username, email, password, role: "patient" }])
          .select()
          .single();

        if (userError) throw userError;

        // Step 2: insert into patients
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

        setPatients((prev) =>
          [...prev, newPatient].sort((a, b) => a.name.localeCompare(b.name))
        );

        alert(
          `✅ Patient added successfully!\n📧 Email: ${email}\n👤 Username: ${username}\n🔑 Password: ${password}`
        );
      }

      resetForm();
    } catch (error: any) {
      console.error("Error saving patient:", error.message);
      alert("❌ Failed to save patient.");
    }
  };

  // ✅ Archive patient
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

  // ✅ Filtered patients
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
                  <td>{patient.gender || "—"}</td>
                  <td>{patient.users?.email || "N/A"}</td>
                  <td>{patient.condition}</td>
                  <td>{patient.doctors?.full_name || "No doctor assigned"}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setViewingPatient(patient)}
                    >
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
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="archive-btn"
                      onClick={() => handleArchivePatient(patient.id)}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Add/Edit Modal */}
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingPatient ? "Edit Patient" : "Add Patient"}</h3>

            <div className="name-fields">
              <input
                type="text"
                placeholder="First Name"
                value={formData.first_name || ""}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Middle Name (Optional)"
                value={formData.middle_name || ""}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.last_name || ""}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <input
              type="email"
              placeholder="Email Address"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingPatient}
            />

            <input
              type="number"
              placeholder="Age"
              value={formData.age || ""}
              onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
            />

            <select
              value={formData.gender || ""}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <DatePicker
              selected={selectedDob}
              onChange={(date) => {
                setSelectedDob(date);
                setFormData({
                  ...formData,
                  date_of_birth: date?.toISOString().split("T")[0],
                });
              }}
              placeholderText="Select Date of Birth"
              className="dob-input"
            />

            {/* ✅ Split Address Fields */}
            <div className="address-fields">
              <input
                type="text"
                placeholder="Street / House No."
                value={formData.street || ""}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
              <input
                type="text"
                placeholder="Barangay"
                value={formData.barangay || ""}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
              />
              <input
                type="text"
                placeholder="City / Municipality"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <input
                type="text"
                placeholder="Province / Region"
                value={formData.province || ""}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
            </div>

            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phone_number || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) {
                  setFormData({ ...formData, phone_number: value });
                }
              }}
              maxLength={11}
            />

            <select
              value={formData.condition || ""}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="">Select Condition</option>
              <option value="Type 1 Diabetes">Type 1 Diabetes</option>
              <option value="Type 2 Diabetes">Type 2 Diabetes</option>
            </select>

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

      {/* ✅ View Modal */}
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
