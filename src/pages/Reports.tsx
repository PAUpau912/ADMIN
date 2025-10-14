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
}

const Reports: React.FC = () => {
  const [activePage, setActivePage] = useState("Reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  // 🔹 Fetch reports
  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      alert("Error fetching reports: " + (error.message || error));
    } else {
      setReports(data || []);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // 🔹 Save new / update existing report
  const handleGenerateReport = async () => {
    const formattedDate = new Date().toISOString().split("T")[0];
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      alert("No user ID found. Please login again.");
      setIsModalOpen(false);
      return;
    }

    if (editingReport) {
      // Update existing
      const { error } = await supabase
        .from("reports")
        .update({
          title: newTitle,
          report_data: newDescription,
          created_at: formattedDate,
        })
        .eq("id", editingReport.id);

      if (error) {
        console.error("Error updating report:", error);
        alert("Error updating report: " + (error.message || error));
      } else {
        // 🔹 Log update activity
        await supabase.from("activities").insert([
          {
            description: "Report updated",
            report_title: newTitle,
            created_at: new Date().toISOString(),
          },
        ]);
        fetchReports();
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from("reports")
        .insert([
          {
            user_id: userId,
            title: newTitle,
            report_data: newDescription,
            created_at: formattedDate,
          },
        ]);

      if (insertError) {
        console.error("Error inserting report:", insertError.message || insertError);
        alert("Error inserting report: " + (insertError.message || insertError));
      } else {
        // 🔹 Log new activity
        await supabase.from("activities").insert([
          {
            description: "New report generated",
            report_title: newTitle,
            created_at: new Date().toISOString(),
          },
        ]);
        fetchReports();
      }
    }

    setIsModalOpen(false);
    setNewTitle("");
    setNewDescription("");
    setEditingReport(null);
  };

  // 🔹 Edit
  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setNewTitle(report.title);
    setNewDescription(report.report_data);
    setIsModalOpen(true);
  };

  // 🔹 Delete
  const handleDeleteReport = async (id: number) => {
    const report = reports.find((r) => r.id === id);

    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) {
      console.error("Error deleting report:", error);
    } else {
      setReports(reports.filter((r) => r.id !== id));

      if (report) {
        // 🔹 Log delete activity
        await supabase.from("activities").insert([
          {
            description: "Report deleted",
            report_title: report.title,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }
  };

  return (
    <div className="layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} />

        <div className="page-content">
          <h2>Reports</h2>

          <button className="generate-report-btn" onClick={() => setIsModalOpen(true)}>
            + Generate Report
          </button>

          <table className="reports-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date Generated</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.title}</td>
                  <td>{new Date(report.created_at).toLocaleDateString("en-GB")}</td>
                  <td>{report.report_data}</td>
                  <td>
                    <button className="edit-btn" onClick={() => handleEditReport(report)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDeleteReport(report.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            <h3>{editingReport ? "Edit Report" : "Generate New Report"}</h3>
            <input
              type="text"
              placeholder="Enter report title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              placeholder="Enter report description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleGenerateReport} className="save-btn">
                {editingReport ? "Update" : "Save"}
              </button>
              <button onClick={() => setIsModalOpen(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
