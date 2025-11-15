import { useState, useEffect } from "react";
import "../assets/css/dashboard.css";
import Sidebar from "../components/sidebar";
import Topbar from "../components/topbar";
import ManagePatients from "../pages/ManagePatients";
import ManageDoctors from "../pages/ManageDoctors";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Archive from "../pages/Archive";
import { Bar } from "react-chartjs-2";
import supabase from "../supabaseClient";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register required chart components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard: React.FC = () => {
  const [activePage, setActivePage] = useState("dashboard");
 const [totalPatients, setTotalPatients] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Total Patients
      const { count: patientCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });
      setTotalPatients(patientCount || 0);

      // Total Doctors
      const { count: doctorCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true });
      setTotalDoctors(doctorCount || 0);

      // Total Reports
      const { count: reportCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true });
      setTotalReports(reportCount || 0);

      // Recent Pending Reports
      const { data: reportData } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false })
        .limit(6);
      setActivities(reportData || []);

      // Chart Data: Patients per month
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, created_at");

      if (patientData) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const counts = Array(months.length).fill(0);

        patientData.forEach((p) => {
          const monthIndex = new Date(p.created_at).getMonth();
          if (counts[monthIndex] !== undefined) {
            counts[monthIndex]++;
          }
        });

        setChartData({
          labels: months,
          datasets: [
            {
              label: "Patients Added",
              data: counts,
              backgroundColor: "rgba(75,192,192,0.6)",
            },
          ],
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="main-content">
        <div className="topbar">
          <Topbar activePage={activePage} />
        </div>

        {activePage === "dashboard" && (
          <div className="dashboard-content">
            <h2>Welcome to the Dashboard</h2>

            {/* Stats Section */}
            <div className="stats-cards">
              <div className="card">Total Patients: {totalPatients}</div>
              <div className="card">Total Doctors: {totalDoctors}</div>
              <div className="card">Reports: {totalReports}</div>
            </div>

            {/* Chart + Recent Activities Side by Side */}
            <div className="chart-activities">
              <div className="chart-container">
                <h3>Monthly Patient Admissions</h3>
                <Bar data={chartData} />
              </div>

              <div className="recent-activities">
                <h3>Recent Pending Reports</h3>
                <ul>
                  {activities.length > 0 ? (
                    activities.map((a) => (
                      <li key={a.id}>
                        <strong>{a.title ? a.title : "Untitled Report"}</strong>
                        <p>{a.report_data ? a.report_data : "No description available"}</p>
                        <small>{new Date(a.created_at).toLocaleString()}</small>
                      </li>
                    ))
                  ) : (
                    <li>No recent reports found.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activePage === "Manage Patients" && <ManagePatients />}
        {activePage === "Manage Doctors" && <ManageDoctors />}
        {activePage === "Reports" && <Reports />}
        {activePage === "Settings" && <Settings />}
        {activePage === "Archive" && <Archive />}
      </div>
    </div>
  );
};

export default Dashboard;