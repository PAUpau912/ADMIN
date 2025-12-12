import React, { useEffect, useState } from "react";
import "../assets/css/managedoctors.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import supabase from "../supabaseClient";
import bcrypt from "bcryptjs";

interface Doctor {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  specialization?: string;
  phone_number?: string;
  address?: string;
  gender?: string;
  prc_license?: string;
  hospital_affiliate?: string;
  user_id?: string | null;
  users?: { email: string }[];
}

interface DoctorFormData extends Partial<Doctor> {
  email?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
}

const ManageDoctors: React.FC = () => {
  const [activePage, setActivePage] = useState("Manage Doctors");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterSpecialization, setSpecialization] = useState("");
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    specialization: "",
    phone_number: "",
    address: "",
    gender: "",
    email: "",
    prc_license: "",
    hospital_affiliate: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
  });
  const [lagunaData, setLagunaData] = useState<Record<string, string[]>>({});
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  // Fetch Laguna barangays JSON
  useEffect(() => {
    fetch("/laguna-barangays.json")
      .then((res) => res.json())
      .then((data) => setLagunaData(data))
      .catch((err) => console.error("Error loading barangays:", err));
  }, []);

  // Fetch doctors
  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from("doctors")
      .select(
        "id, first_name, middle_name, last_name, specialization, phone_number, address, gender, prc_license, hospital_affiliate, user_id, users:user_id(email)"
      )
      .eq("is_archived", false)
      .order("last_name", { ascending: true });

    if (error) console.error("Error fetching doctors:", error);
    else setDoctors(data || []);
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Combine address fields into one string
  const getFullAddress = () => {
    const parts = [
      formData.street,
      formData.barangay,
      formData.city,
      formData.province,
    ].filter(Boolean);
    return parts.join(", ");
  };

  // Add or Update doctor
  const handleSaveDoctor = async () => {
  try {
    if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
      alert("⚠️ Please enter the doctor's first and last name.");
      return;
    }

    if (!formData.email?.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      alert("⚠️ Please enter a valid email address.");
      return;
    }

    const fullName = `${formData.first_name} ${formData.middle_name || ""} ${formData.last_name}`.trim();
    const fullAddress = getFullAddress();

    if (editingDoctor) {
      // 🔹 Update existing doctor
      const { error } = await supabase
        .from("doctors")
        .update({
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          full_name: fullName,
          specialization: formData.specialization,
          phone_number: formData.phone_number,
          address: fullAddress,
          gender: formData.gender,
          prc_license: formData.prc_license,
          hospital_affiliate: formData.hospital_affiliate,
        })
        .eq("id", editingDoctor.id);

      if (error) throw error;
      alert("✅ Doctor updated successfully!");
    } else {
      // 🔹 Add new doctor
      const generateRandomPassword = (length = 8) => {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      };
      const rawPassword = generateRandomPassword();
      const hashedPassword = bcrypt.hashSync(rawPassword, 10); // 🔑 Hash the password

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingUser) {
        alert("⚠️ This email is already registered.");
        return;
      }

      // 🔹 Save to users with hashed password and form email only
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            email: formData.email, // email from form only
            username: fullName.replace(/\s+/g, "").toLowerCase(),
            full_name: fullName,
            password: hashedPassword, // save hashed
            role: "doctor",
          },
        ])
        .select()
        .single();

      if (userError) throw userError;

      // 🔹 Save doctor profile
      const { error: doctorError } = await supabase.from("doctors").insert([
        {
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          full_name: fullName,
          specialization: formData.specialization,
          phone_number: formData.phone_number,
          address: fullAddress,
          gender: formData.gender,
          prc_license: formData.prc_license,
          hospital_affiliate: formData.hospital_affiliate,
          user_id: newUser.id,
        },
      ]);

      if (doctorError) throw doctorError;

      // 🔹 Show admin the raw password (not saved)
      setGeneratedCredentials({
        name: fullName,
        email: formData.email!,
        password: rawPassword,
      });
      setShowCredentialsModal(true);

      alert("✅ Doctor added successfully!");
    }

    await fetchDoctors();
    resetForm();
  } catch (error: any) {
    console.error("❌ Error saving doctor:", error);
    alert("❌ Failed to save doctor. Check console for details.");
  }
};

  // Archive doctor
  const handleDeleteDoctor = async (doctorId: number) => {
    const confirmArchive = window.confirm("Are you sure you want to archive this doctor?");
    if (!confirmArchive) return;

    const { error } = await supabase
      .from("doctors")
      .update({ is_archived: true })
      .eq("id", doctorId);

    if (error) {
      console.error("Error archiving doctor:", error);
      alert("❌ Failed to archive doctor.");
    } else {
      alert("✅ Doctor archived successfully!");
      fetchDoctors();
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      middle_name: "",
      last_name: "",
      specialization: "",
      phone_number: "",
      address: "",
      gender: "",
      email: "",
      prc_license: "",
      hospital_affiliate: "",
      street: "",
      barangay: "",
      city: "",
      province: "",
    });
    setEditingDoctor(null);
    setShowForm(false);
  };

  const filteredDoctors = doctors.filter((d) => {
    const fullName = `${d.first_name} ${d.middle_name || ""} ${d.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesSpecialization =
      filterSpecialization === "" ||
      d.specialization?.toLowerCase() === filterSpecialization.toLowerCase();

    return matchesSearch && matchesSpecialization;
  });

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} onSearch={setSearchQuery} />

        <div className="page-content">
          <h2>Manage Doctors</h2>
          <button className="add-doctor-btn" onClick={() => setShowForm(true)}>
            Add Doctor
          </button>

          <div className="filter-section">
            <label htmlFor="specializationFilter">Filter by Specialization: </label>
            <select
              id="specializationFilter"
              value={filterSpecialization}
              onChange={(e) => setSpecialization(e.target.value)}
            >
              <option value="">All Specializations</option>
              <option value="Endocrinologist">Endocrinologist</option>
              <option value="Pediatric Endocrinologist">Pediatric Endocrinologist</option>
              <option value="General Endocrinologist">General Endocrinologist</option>
            </select>
          </div>

          <table className="doctors-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th>PRC License</th>
                <th>Hospital</th>
                <th>Phone</th>
                <th>Sex</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>{`${doctor.first_name} ${doctor.middle_name || ""} ${doctor.last_name}`}</td>
                  <td>{doctor.specialization || "—"}</td>
                  <td>{doctor.prc_license || "—"}</td>
                  <td>{doctor.hospital_affiliate || "—"}</td>
                  <td>{doctor.phone_number || "—"}</td>
                  <td>{doctor.gender || "—"}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => {
                          const addressParts = (doctor.address || "").split(",").map((a) => a.trim());
                          setEditingDoctor(doctor);
                          setFormData({
                            ...doctor,
                            email: doctor.users?.[0]?.email || "",
                            street: addressParts[0] || "",
                            barangay: addressParts[1] || "",
                            city: addressParts[2] || "",
                            province: addressParts[3] || "",
                          });
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="archive-btn"
                        onClick={() => handleDeleteDoctor(doctor.id)}
                      >
                        Archive
                      </button>
                    </div>
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
              placeholder="Email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingDoctor}
            />

            <select
              value={formData.specialization || ""}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            >
              <option value="">Select Specialization</option>
              <option value="Endocrinologist">Endocrinologist</option>
              <option value="Pediatric Endocrinologist">Pediatric Endocrinologist</option>
              <option value="General Endocrinologist">General Endocrinologist</option>
            </select>

            <input
              type="text"
              placeholder="PRC License Number"
              value={formData.prc_license || ""}
              onChange={(e) => setFormData({ ...formData, prc_license: e.target.value })}
            />

            <input
              type="text"
              placeholder="Hospital Affiliation"
              value={formData.hospital_affiliate || ""}
              onChange={(e) => setFormData({ ...formData, hospital_affiliate: e.target.value })}
            />

            <input
              type="text"
              placeholder="Phone Number (11 digits)"
              value={formData.phone_number || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d{0,11}$/.test(value)) setFormData({ ...formData, phone_number: value });
              }}
            />

            <select
              value={formData.gender || ""}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            {/* Address Fields */}
            <h4>Address</h4>
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

            <div className="modal-actions">
              <button className="save-btn" onClick={handleSaveDoctor}>
                {editingDoctor ? "Update" : "Save"}
              </button>
              <button className="cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && generatedCredentials && (
        <div className="modal-overlay">
          <div className="modal-content credentials-modal">
            <h3>🩺 Doctor Account Created Successfully!</h3>
            <p><strong>Name:</strong> {generatedCredentials.name}</p>
            <p><strong>Email:</strong> {generatedCredentials.email}</p>
            <p><strong>Password:</strong> {generatedCredentials.password}</p>
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
                Copy
              </button>
              <button className="close-btn" onClick={() => setShowCredentialsModal(false)}>
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
