import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import "../assets/css/archive.css";

const Archive: React.FC = () => {
  const [activePage, setActivePage] = useState("Archive");
  const [archivedDoctors, setArchivedDoctors] = useState<any[]>([]);
  const [archivedPatients, setArchivedPatients] = useState<any[]>([]);
  const [archivedReports, setArchivedReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"doctors" | "patients" | "reports">("doctors");

  useEffect(() => {
    fetchArchivedData();
  }, []);

  const fetchArchivedData = async () => {
    const { data: doctors } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_archived", true);

    const { data: patients } = await supabase
      .from("patients")
      .select("*")
      .eq("is_archived", true);

    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .eq("is_archived", true);

    setArchivedDoctors(doctors || []);
    setArchivedPatients(patients || []);
    setArchivedReports(reports || []);
  };

  const handleRestore = async (table: string, id: string) => {
    const { error } = await supabase
      .from(table)
      .update({ is_archived: false })
      .eq("id", id);

    if (!error) fetchArchivedData();
  };
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
  return (
    <div className="dashboard-archive">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="dashboard-content-archive">
        <Topbar activePage={activePage} />

        <div className="archive-container">
          {/* Tabs */}
          <div className="archive-tabs">
            <button
              className={activeTab === "doctors" ? "active" : ""}
              onClick={() => setActiveTab("doctors")}
            >
              Doctors
            </button>
            <button
              className={activeTab === "patients" ? "active" : ""}
              onClick={() => setActiveTab("patients")}
            >
              Patients
            </button>
            <button
              className={activeTab === "reports" ? "active" : ""}
              onClick={() => setActiveTab("reports")}
            >
              Reports
            </button>
          </div>

          {/* Archived Doctors */}
          {activeTab === "doctors" && (
            <div className="archive-table">
              <h3>Archived Doctors</h3>
              <table className="table-style">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Specialization</th>
                    <th>Hospital Affiliate</th>
                    <th>PRC License</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedDoctors.length > 0 ? (
                    archivedDoctors.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.full_name}</td>
                        <td>{doc.specialization}</td>
                        <td>{doc.hospital_affiliate}</td>
                        <td>{doc.prc_license}</td>
                        <td>
                          <button
                            className="restore-btn"
                            onClick={() => handleRestore("doctors", doc.id)}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="no-data">
                        No archived doctors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Archived Patients */}
          {activeTab === "patients" && (
            <div className="archive-table">
              <h3>Archived Patients</h3>
              <table className="table-style">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Condition</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedPatients.length > 0 ? (
                    archivedPatients.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.age}</td>
                        <td>{p.gender}</td>
                        <td>{p.condition}</td>
                        <td>
                          <button
                            className="restore-btn"
                            onClick={() => handleRestore("patients", p.id)}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="no-data">
                        No archived patients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Archived Reports */}
          {activeTab === "reports" && (
            <div className="archive-table">
              <h3>Archived Reports</h3>
              <table className="table-style">
                <thead>
                  <tr>
                    <th>Report Title</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedReports.length > 0 ? (
                    archivedReports.map((r) => (
                      <tr key={r.id}>
                        <td>{r.title}</td>
                        <td>{formatDate(r.created_at)}</td>
                        <td>{r.report_data}</td>
                        <td>
                          <button
                            className="restore-btn"
                            onClick={() => handleRestore("reports", r.id)}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="no-data">
                        No archived reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
