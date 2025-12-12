import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import "../assets/css/topbar.css";
import AnonymousProfilePic from "../assets/anonymous.jpg";

interface AdminProfile {
  id?: string;
  username: string;
  full_name: string;
  email: string;
}

interface TopbarProps {
  activePage: string;
  onSearch?: (query: string) => void;
}

const Topbar: React.FC<TopbarProps> = ({ activePage, onSearch }) => {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  // 🔔 Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  // 📩 Email states
  const [emails, setEmails] = useState<any[]>([]);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [showEmails, setShowEmails] = useState(false);

 // 📩 Fetch emails for admin
  useEffect(() => {
    const storedAdminEmail = localStorage.getItem("adminEmail");
    if (!storedAdminEmail) return;

    const loadEmails = async () => {
      const { data, error } = await supabase
        .from("emails_to_admin")
        .select("*")
        .eq("recipient_email", storedAdminEmail)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEmails(data);
        setUnreadEmails(data.filter((e) => !e.is_read).length);
      }
    };

    loadEmails();

    // Real-time subscription
    const channel = supabase
      .channel("realtime-emails")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emails_to_admin" },
        (payload) => {
          if (payload.new.recipient_email === storedAdminEmail) {
            setEmails((prev) => [payload.new, ...prev]);
            setUnreadEmails((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markEmailAsRead = async (id: string) => {
    await supabase.from("emails_to_admin").update({ is_read: true }).eq("id", id);
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, is_read: true } : email))
    );
    setUnreadEmails((prev) => Math.max(prev - 1, 0));
  };
useEffect(() => {
  const loadNotifications = async () => {
    const { data: reportData, error: reportError } = await supabase
      .from("notifications_report")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: patientData, error: patientError } = await supabase
      .from("notifications_patient_admin")
      .select("*")
      .order("created_at", { ascending: false });

    if (reportError || patientError) {
      console.error("Failed to load notifications", reportError || patientError);
      return;
    }

    const combined = [...(reportData || []), ...(patientData || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(combined);
    setUnreadCount(combined.filter((n) => !n.is_read).length);
  };

  loadNotifications();

  const channel = supabase.channel("realtime-notifs");

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "notifications_report" },
    (payload) => {
      setNotifications((prev) => [payload.new, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  );

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "notifications_patient_admin" },
    (payload) => {
      setNotifications((prev) => [payload.new, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);


 // 📌 Mark ONE notification as read
  const markSingleAsRead = async (notif: any) => {
    try {
      // Determine which table the notification belongs to
      const table = notif.patient_id ? "notifications_patient_admin" : "notifications_report";

      await supabase.from(table).update({ is_read: true }).eq("id", notif.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // 📌 Fetch admin profile
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const email = localStorage.getItem("adminEmail");
        if (!email) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("id, email, username, full_name")
          .eq("email", email)
          .single();

        if (error || !data) {
          console.error("Error fetching profile:", error);
          return;
        }

        setAdminProfile(data);

        // ✅ Check if avatar file exists
        const extensions = ["jpg", "jpeg", "png", "JPG"];
        let foundUrl: string | null = null;

        for (const ext of extensions) {
          const filePath = `avatars/${data.id}.${ext}`;
          const { data: publicUrlData } = supabase.storage
            .from("profile_pictures")
            .getPublicUrl(filePath);

          const { data: fileBlob, error: listError } = await supabase.storage
            .from("profile_pictures")
            .download(filePath);

          if (!listError && fileBlob) {
            foundUrl = publicUrlData.publicUrl;
            break;
          }
        }

        setProfileUrl(foundUrl);
      } catch (err) {
        console.error("❌ Fetch admin profile failed:", err);
      }
    };

    fetchAdminProfile();
  }, [navigate]);

  // 📅 Format date readable
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

  const displayName =
    adminProfile?.username ||
    adminProfile?.full_name ||
    adminProfile?.email ||
    "Admin";

  const profileImage = profileUrl || AnonymousProfilePic;

  return (
    <div className="topbar-content">
      {/* ✅ DASHBOARD */}
      {activePage === "dashboard" && (
        <div className="topbar-center dashboard">
          <h3>
            Welcome, <span className="admin-name">{displayName}</span>
          </h3>
          <div className="topbar-right">
            {/* 📩 EMAIL BUTTON */}
              <div className="email-wrapper">
                <button
                  className="email-btn"
                  onClick={() => setShowEmails(!showEmails)}
                >
                  <i className="fas fa-envelope"></i>
                  {unreadEmails > 0 && <span className="notif-dot"></span>}
                </button>

                {showEmails && (
                  <div
                    className="notif-dropdown"
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      padding: "8px",
                      width: "260px",
                    }}
                  >
                    <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Messages</h4>

                    {emails.length === 0 && (
                      <p className="empty" style={{ fontSize: "12px" }}>
                        No new messages
                      </p>
                    )}

                    {emails.slice(0, 10).map((email) => {
                      const isUnread = !email.is_read;

                      return (
                        <div
                          key={email.id}
                          className={`notif-item ${isUnread ? "unread" : ""}`}
                          style={{
                            fontSize: "13px",
                            padding: "8px 28px 8px 8px",
                            borderBottom: "1px solid #e0e0e0",
                            position: "relative",
                            cursor: "pointer",
                            backgroundColor: isUnread ? "#e9f3ff" : "#fff",
                          }}
                          onClick={() => markEmailAsRead(email.id)}
                        >
                          <p style={{ margin: 0, fontWeight: "bold" }}>{email.subject}</p>
                          <p style={{ margin: "4px 0", fontSize: "12px" }}>
                            {email.message.slice(0, 40)}...
                          </p>

                          <span style={{ fontSize: "11px", color: "#888" }}>
                            {formatDate(email.created_at)}
                          </span>

                          {/* ❌ DELETE EMAIL */}
                          <span
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              color: "#888",
                              fontSize: "15px",
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();

                              try {
                                await supabase
                                  .from("emails_to_admin")
                                  .delete()
                                  .eq("id", email.id);

                                setEmails((prev) =>
                                  prev.filter((n) => n.id !== email.id)
                                );

                                if (isUnread) {
                                  setUnreadEmails((prev) => Math.max(prev - 1, 0));
                                }
                              } catch (err) {
                                console.error("❌ Failed to delete email:", err);
                              }
                            }}
                          >
                            ×
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            {/* 🔔 Notification Button + Dropdown */}
            <div className="notification-wrapper">
              <>
                <button
                  className="notification-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <i className="fas fa-bell"></i>
                  {unreadCount > 0 && <span className="notif-dot"></span>}
                </button>

                {showNotifications && (
                  <div className="notif-dropdown" style={{ maxHeight: "300px", overflowY: "auto", padding: "8px" }}>
                    <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Notifications</h4>
                    {notifications.length === 0 && (
                      <p className="empty" style={{ fontSize: "12px" }}>No new notifications</p>
                    )}
                    {notifications.slice(0, 10).map((notif) => {
                      const isUnread = !notif.is_read;
                      return (
                        <div
                          key={notif.id}
                          className={`notif-item ${isUnread ? "unread" : ""}`}
                          style={{
                            fontSize: "13px",
                            position: "relative",
                            padding: "8px 28px 8px 8px",
                            borderBottom: "1px solid #e0e0e0",
                            cursor: "pointer",
                            backgroundColor: isUnread ? "#f0fff0" : "#fff", // subtle highlight for unread
                          }}
                          onClick={() => markSingleAsRead(notif)}
                        >
                          <p style={{ margin: 0 }}>{notif.message}</p>
                          <span style={{ fontSize: "11px", color: "#999" }}>
                            {formatDate(notif.created_at)}
                          </span>

                          {/* Close / Dismiss button */}
                          <span
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              color: "#888",
                            }}
                            onClick={async (e) => {
                              e.stopPropagation(); // prevent marking as read
                              try {
                                const table = notif.patient_id
                                  ? "notifications_patient_admin"
                                  : "notifications_report";
                                await supabase.from(table).delete().eq("id", notif.id);

                                setNotifications((prev) =>
                                  prev.filter((n) => n.id !== notif.id)
                                );
                                setUnreadCount((prev) => Math.max(prev - 1, 0));
                              } catch (err) {
                                console.error("Failed to delete notification:", err);
                              }
                            }}
                          >
                            ×
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}


              </>
            </div>

            {/* Profile Picture */}
            <div className="profile">
              <img
                src={profileImage}
                alt="Profile"
                className="topbar-profile"
                onError={(e) => {
                  e.currentTarget.src = AnonymousProfilePic;
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ PATIENTS */}
      {activePage === "Manage Patients" && (
        <div className="topbar-center patients">
          <h3>Patients List</h3>
          <div className="topbar-actions">
            <div className="search-bar">
              <span className="search-icon">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search patients..."
                className="search-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ DOCTORS */}
      {activePage === "Manage Doctors" && (
        <div className="topbar-center doctors">
          <h3>Doctor's List</h3>
          <div className="topbar-actions">
            <div className="search-bar">
              <span className="search-icon">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search doctors..."
                className="search-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ REPORTS */}
      {activePage === "Reports" && (
        <div className="topbar-center">
          <h3>Reports Overview</h3>
        </div>
      )}

      {/* ✅ SETTINGS */}
      {activePage === "settings" && (
        <div className="topbar-center">
          <h3>Settings</h3>
        </div>
      )}

      {/* ✅ ARCHIVE */}
      {activePage === "Archive" && (
        <div className="topbar-center">
          <h3>Archive</h3>
        </div>
      )}
    </div>
  );
};

export default Topbar;
