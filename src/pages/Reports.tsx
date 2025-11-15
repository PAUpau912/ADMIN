// Updated Reports.tsx with status (Pending/Solved) and Doctor Name field
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import "../assets/css/reports.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";

interface Report {
  id: number;
  title: string;
  report_data: string;
  created_at: string;
  full_name?: string;
  status?: string; // "Pending" | "Solved"
  is_archived?: boolean;
  user_id?: string;
  users?: { full_name: string; role: string };
}

const Reports: React.FC = () => {
  const [activePage, setActivePage] = useState("Reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [status, setStatus] = useState("Pending");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Fetch reports (exclude archived)
  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select(`
        id,
        title,
        report_data,
        created_at,
        status,
        is_archived,
        user_id,
        users:user_id(full_name, role)
      `)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      alert("Error fetching reports: " + (error.message || error));
    } else {
      // Map users to a single object if it's an array
      const mappedData = (data || []).map((report: any) => ({
        ...report,
        users: Array.isArray(report.users) ? report.users[0] : report.users,
      }));
      setReports(mappedData);
      setFilteredReports(mappedData);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter by date and status
  useEffect(() => {
    let filtered = reports;
    if (fromDate || toDate) {
      filtered = filtered.filter((report) => {
        const reportDate = new Date(report.created_at);
        const from = fromDate ? new Date(fromDate) : new Date("1900-01-01");
        const to = toDate ? new Date(toDate) : new Date("9999-12-31");
        return reportDate >= from && reportDate <= to;
      });
    }
    if (status && status !== "All") {
      filtered = filtered.filter((report) => report.status === status);
    }
    setFilteredReports(filtered);
  }, [fromDate, toDate, status, reports]);

  // Save or update report
  const handleGenerateReport = async () => {
    const formattedDate = new Date().toISOString().split("T")[0];
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      alert("No user ID found. Please login again.");
      setIsModalOpen(false);
      return;
    }

    if (!newTitle.trim() || !newDescription.trim()) {
      alert("⚠️ Please complete all fields.");
      return;
    }

    // Get doctor name and role from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      alert("Unable to fetch doctor info.");
      return;
    }

    if (editingReport) {
      // Update
      const { error } = await supabase
        .from("reports")
        .update({
          title: newTitle,
          report_data: newDescription,
          status: status,
          created_at: formattedDate,
          user_id: userId,
        })
        .eq("id", editingReport.id);

      if (error) alert("Error updating report: " + error.message);
      else fetchReports();
    } else {
      // Insert new
      const { error } = await supabase.from("reports").insert([
        {
          user_id: userId,
          title: newTitle,
          report_data: newDescription,
          doctor_name: userData.full_name,
          status: status,
          created_at: formattedDate,
          is_archived: false,
        },
      ]);

      if (error) alert("Error inserting report: " + error.message);
      else fetchReports();
    }

    setIsModalOpen(false);
    setNewTitle("");
    setNewDescription("");
    setStatus("Pending");
    setEditingReport(null);
  };

  // Edit
  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setNewTitle(report.title);
    setNewDescription(report.report_data);
    setStatus(report.status || "Pending");
    setIsModalOpen(true);
  };

  // Archive
  const handleArchiveReport = async (id: number) => {
    if (!window.confirm("Are you sure you want to archive this report?")) return;

    await supabase.from("reports").update({ is_archived: true }).eq("id", id);
    setReports(reports.filter((r) => r.id !== id));
  };

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} />

        <div className="page-content">
          <h2>Reports</h2>

          <div className="filter-section">
            <label>From: </label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <label>To: </label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <label>Status: </label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Solved">Solved</option>
            </select>
          </div>

          <button className="generate-report-btn" onClick={() => setIsModalOpen(true)}>
            + Generate Report
          </button>

          <table className="reports-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date Generated</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.title}</td>
                    <td>{report.users?.full_name || report.full_name}</td>
                    <td>{report.users?.role || "N/A"}</td>
                    <td>
                      <span
                        className={`status-badge ${report.status === "Solved" ? "solved" : "pending"}`}
                        style={{
                          backgroundColor: report.status === "Solved" ? "#4CAF50" : "#f44336",
                          color: "#fff",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontWeight: 500,
                          fontSize: "0.95rem"
                        }}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                    <td>{report.report_data}</td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEditReport(report)}>Edit</button>
                      <button className="archive-btn" onClick={() => handleArchiveReport(report.id)}>Archive</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>No reports found for this date range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            <h3>{editingReport ? "Edit Report" : "Generate New Report"}</h3>
            {/* Dropdown for common report titles */}
            <select className = "title-dropdown "value={newTitle} onChange={e => setNewTitle(e.target.value)}>
              <option value="">Select Report Title</option>
              <option value="System Login Issue">System Login Issue</option>
              <option value="Account Registration Problem">Account Registration Problem</option>
              <option value="Data Sync Error">Data Sync Error</option>
              <option value="Patient Record Update">Patient Record Update</option>
              <option value="Doctor Profile Update">Doctor Profile Update</option>
              <option value="Report Generation Issue">Report Generation Issue</option>
              <option value="Access Rights Concern">Access Rights Concern</option>
              <option value="System Performance Feedback">System Performance Feedback</option>
              <option value="Other System Concern">Other System Concern</option>
            </select>
            <textarea placeholder="Enter report description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            {/* Dropdown for status */}
            <select className="status-dropdown" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Solved">Solved</option>
            </select>
            <div className="modal-actions">
              <button onClick={handleGenerateReport} className="save-btn">{editingReport ? "Update" : "Save"}</button>
              <button onClick={() => setIsModalOpen(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
