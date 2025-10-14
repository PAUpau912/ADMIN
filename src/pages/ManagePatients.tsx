import React, { useState, useEffect } from "react";
import "../assets/css/managepatients.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import supabase from "../supabaseClient";

interface Patient {
  id: number;
  name: string;
  age?: number;
  date_of_birth?: string;
  address?: string;
  phone_number?: string;
  condition: string;
  doctor_id?: string;
  user_id?: string | null;
  gender: string;
  doctors?: { name: string };
  users?: { email: string };
}

interface Doctor {
  id: string;
  name: string;
}

interface PatientFormData extends Partial<Patient> {
  email?: string;
}

const ManagePatients: React.FC = () => {
  const [activePage, setActivePage] = useState("Manage Patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<PatientFormData>({
    name: "",
    age: undefined,
    gender: "",
    date_of_birth: "",
    address: "",
    phone_number: "",
    condition: "",
    doctor_id: "",
    email: "",
  });
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const [cbgs, setCbgs] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [logins, setLogins] = useState<any[]>([]);

  // ✅ Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*, doctors(name), users(email)");
      if (error) console.log(error);
      else setPatients(data);
    };
    fetchPatients();
  }, []);

  // ✅ Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from("doctors").select("*");
      if (error) console.error("Error fetching doctors:", error);
      setDoctors(data || []);
    };
    fetchDoctors();
  }, []);

  // ✅ Add new patient
  const handleAddPatient = async (formData: any) => {
    try {
      if (!formData.name?.trim()) {
        alert("⚠️ Please enter the patient's name.");
        return;
      }

      const email =
        formData.email ||
        `${formData.name.replace(/\s+/g, "").toLowerCase()}@tempmail.com`;
      const defaultPassword = "123456";

      // Check for existing user
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        alert("⚠️ This email is already registered.");
        return;
      }

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            email,
            username: formData.name.replace(/\s+/g, "").toLowerCase(),
            full_name: formData.name,
            password: defaultPassword,
            role: "patient",
          },
        ])
        .select()
        .single();

      if (userError) throw userError;

      // ✅ Create patient with full details
      const { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert([
          {
            name: formData.name,
            age: formData.age,
            gender: formData.gender,
            date_of_birth: formData.date_of_birth,
            address: formData.address,
            phone_number: formData.phone_number,
            condition: formData.condition,
            doctor_id: formData.doctor_id || null,
            user_id: newUser.id,
          },
        ])
        .select("*, doctors(name), users(email)")
        .single();

      if (patientError) throw patientError;

      setPatients([...patients, newPatient]);
      resetForm();

      setGeneratedCredentials({
        name: formData.name,
        email,
        password: defaultPassword,
      });
      setShowCredentialsModal(true);
    } catch (error: any) {
      console.error("Error adding patient:", error.message);
      alert("❌ Failed to add patient. Check console for details.");
    }
  };

  // ✅ Update patient info
  const handleUpdatePatient = async () => {
    if (!editingPatient) return;

    try {
      let userId = editingPatient.user_id;

      if (!userId && formData.email) {
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([{ email: formData.email, password: "123456", role: "patient" }])
          .select()
          .single();
        if (userError) throw userError;
        userId = newUser.id;
      }

      const { data, error } = await supabase
        .from("patients")
        .update({
          name: formData.name,
          age: formData.age,
          date_of_birth: formData.date_of_birth,
          address: formData.address,
          phone_number: formData.phone_number,
          condition: formData.condition,
          doctor_id: formData.doctor_id || null,
          gender: formData.gender,
          user_id: userId,
        })
        .eq("id", editingPatient.id)
        .select("*, doctors(name), users(email)")
        .single();

      if (error) throw error;

      setPatients(patients.map((p) => (p.id === editingPatient.id ? data : p)));
      resetForm();
    } catch (err: any) {
      alert("Error updating patient: " + err.message);
    }
  };

  // ✅ Delete patient
  const handleDeletePatient = async (id: number) => {
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      alert("Error deleting patient: " + error.message);
      return;
    }
    setPatients(patients.filter((p) => p.id !== id));
  };

  // ✅ View details + logs
  const openViewModal = async (patient: Patient) => {
    setViewingPatient(patient);
    try {
      const [cbgsData, mealsData, activitiesData, loginsData] = await Promise.all([
        supabase.from("cbgs").select("*").eq("patient_id", patient.id),
        supabase.from("meals").select("*").eq("patient_id", patient.id),
        supabase.from("activities").select("*").eq("patient_id", patient.id),
        supabase.from("logins").select("*").eq("patient_id", patient.id),
      ]);

      setCbgs(cbgsData.data || []);
      setMeals(mealsData.data || []);
      setActivities(activitiesData.data || []);
      setLogins(loginsData.data || []);
    } catch (err) {
      console.error("Error loading patient logs:", err);
    }
  };

  const openAddForm = () => {
    setEditingPatient(null);
    setFormData({
      name: "",
      age: "",
      gender: "",
      date_of_birth: "",
      address: "",
      phone_number: "",
      condition: "",
      doctor_id: "",
      email: "",
    });
    setShowForm(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      ...patient,
      doctor_id: patient.doctor_id || "",
      email: patient.users?.email || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      age: "",
      gender: "",
      date_of_birth: "",
      address: "",
      phone_number: "",
      condition: "",
      doctor_id: "",
      email: "",
    });
    setEditingPatient(null);
    setShowForm(false);
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} onSearch={setSearchQuery} />

        <div className="page-content">
          <h2>Manage Patients</h2>
          <button className="add-patient-btn" onClick={openAddForm}>
            Add Patient
          </button>

          <table className="patients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Condition</th>
                <th>Doctor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.name}</td>
                  <td>{patient.age || "—"}</td>
                  <td>{patient.gender || "—"}</td>
                  <td>{patient.condition}</td>
                  <td>{patient.doctors?.name || "No doctor assigned"}</td>
                  <td>
                    <button className="view-btn" onClick={() => openViewModal(patient)}>
                      View
                    </button>
                    <button className="edit-btn" onClick={() => openEditForm(patient)}>
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeletePatient(patient.id)}
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

      {/* ✅ ADD / EDIT FORM */}
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingPatient ? "Edit Patient" : "Add New Patient"}</h3>

            <input
              type="text"
              placeholder="Patient Name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <input
              type="date"
              placeholder="Date of Birth"
              value={formData.date_of_birth || ""}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />

            <input
              type="text"
              placeholder="Address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phone_number || ""}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />

            <select
              value={formData.condition || ""}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="">Select Diabetes Type</option>
              <option value="Type 1 Diabetes">Type 1 Diabetes</option>
              <option value="Type 2 Diabetes">Type 2 Diabetes</option>
            </select>

            <select
              value={formData.doctor_id || ""}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
            >
              <option value="">Select Doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>

            <input
              type="email"
              placeholder="Email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <div className="modal-actions">
              {editingPatient ? (
                <button className="save-btn" onClick={handleUpdatePatient}>
                  Update
                </button>
              ) : (
                <button className="save-btn" onClick={() => handleAddPatient(formData)}>
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

      {/* ✅ VIEW PATIENT DETAILS MODAL */}
      {viewingPatient && (
        <div className="modal">
          <div className="modal-content view-modal">
            <h3>👤 Patient Details</h3>
            <div className="view-section">
              <p><strong>Name:</strong> {viewingPatient.name}</p>
              <p><strong>Email:</strong> {viewingPatient.users?.email || "—"}</p>
              <p><strong>Gender:</strong> {viewingPatient.gender}</p>
              <p><strong>Age:</strong> {viewingPatient.age || "—"}</p>
              <p><strong>Date of Birth:</strong> {viewingPatient.date_of_birth || "—"}</p>
              <p><strong>Address:</strong> {viewingPatient.address || "—"}</p>
              <p><strong>Phone:</strong> {viewingPatient.phone_number || "—"}</p>
              <p><strong>Condition:</strong> {viewingPatient.condition}</p>
              <p><strong>Doctor:</strong> {viewingPatient.doctors?.name || "—"}</p>
            </div>
             <hr style={{ margin: "15px 0" }} />

            {/* 🩸 CBGs */}
            <div className="view-section">
              <h4>🩸 Blood Sugar Logs (CBGs)</h4>
              {cbgs.length > 0 ? (
                <table className="inner-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Value (mg/dL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cbgs.map((c, i) => (
                      <tr key={i}>
                        <td>{new Date(c.date).toLocaleDateString()}</td>
                        <td>{c.time || "—"}</td>
                        <td>{c.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No blood sugar logs found.</p>
              )}
            </div>

            {/* 🍽 Meals */}
            <div className="view-section">
              <h4>🍽️ Meal Records</h4>
              {meals.length > 0 ? (
                <table className="inner-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Meal Type</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meals.map((m, i) => (
                      <tr key={i}>
                        <td>{new Date(m.date).toLocaleDateString()}</td>
                        <td>{m.meal_type || "—"}</td>
                        <td>{m.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No meal records found.</p>
              )}
            </div>

            {/* 🏃 Activities */}
            <div className="view-section">
              <h4>🏃 Activity Records</h4>
              {activities.length > 0 ? (
                <table className="inner-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Activity</th>
                      <th>Duration (mins)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a, i) => (
                      <tr key={i}>
                        <td>{new Date(a.date).toLocaleDateString()}</td>
                        <td>{a.activity_type || "—"}</td>
                        <td>{a.duration || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No activity records found.</p>
              )}
            </div>

            {/* 💉 Insulin Logs */}
            <div className="view-section">
              <h4>💉 Insulin Logs</h4>
              {logins.length > 0 ? (
                <table className="inner-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Dosage (units)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logins.map((ins, i) => (
                      <tr key={i}>
                        <td>{new Date(ins.date).toLocaleDateString()}</td>
                        <td>{ins.time || "—"}</td>
                        <td>{ins.dosage || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No insulin logs found.</p>
              )}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setViewingPatient(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ✅ GENERATED CREDENTIALS MODAL */}
        {showCredentialsModal && generatedCredentials && (
          <div className="modal">
            <div className="modal-content credentials-modal">
              <h3>🪪 Patient Account Created</h3>
              <p><strong>Name:</strong> {generatedCredentials.name}</p>
              <p><strong>Email:</strong> {generatedCredentials.email}</p>
              <p><strong>Temporary Password:</strong> {generatedCredentials.password}</p>

              <p style={{ marginTop: "10px", color: "#555" }}>
                Please provide these credentials to the patient so they can log in.
              </p>

              <div className="modal-actions">
                <button
                  className="save-btn"
                  onClick={() => setShowCredentialsModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
};

export default ManagePatients;