import { useRef, useState } from "react";
import { uploadCSV, uploadPDF } from "../api";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [activeTab, setActiveTab] = useState("file");
  const [fileType, setFileType] = useState("csv");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState([]);
  const fileRef = useRef();
  const navigate = useNavigate();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const ext = dropped.name.split(".").pop().toLowerCase();
      if (ext === "csv" || ext === "pdf") {
        setFileType(ext);
        setFile(dropped);
      } else {
        showToast("Only CSV and PDF files are accepted", "error");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return showToast("Please select a file first", "error");
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    const entry = { name: file.name, type: fileType, time: new Date(), status: "processing" };
    setHistory(prev => [entry, ...prev]);

    try {
      if (fileType === "csv") {
        const res = await uploadCSV(formData);
        showToast(`${res.data.message} — ${res.data.count || ""} rows imported`);
      } else {
        const res = await uploadPDF(formData);
        showToast(res.data.message);
      }
      entry.status = "done";
      setHistory(prev => [...prev]);
      setFile(null);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      entry.status = "error";
      setHistory(prev => [...prev]);
      showToast(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    return `${Math.floor(s / 3600)} hr ago`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>upload_file</span>
          Data Upload Page
        </h1>
        <p>Upload reports and manually enter data to bring scattered community needs information into the system</p>
      </div>

      <div className="dash-grid">
        {/* Left: Upload */}
        <div>
          <div className="card">
            <div className="card-title">
              <span className="material-symbols-outlined">cloud_upload</span>
              Upload New Data
            </div>

            {/* Tabs */}
            <div className="tab-bar">
              <button className={`tab-item ${activeTab === "file" ? "active" : ""}`}
                onClick={() => setActiveTab("file")}>
                Upload File
              </button>
              <button className={`tab-item ${activeTab === "manual" ? "active" : ""}`}
                onClick={() => setActiveTab("manual")}>
                Manual Entry
              </button>
            </div>

            {activeTab === "file" ? (
              <>
                {/* File Type Selector */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button className={`btn btn-sm ${fileType === "csv" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => { setFileType("csv"); setFile(null); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>table_chart</span> CSV
                  </button>
                  <button className={`btn btn-sm ${fileType === "pdf" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => { setFileType("pdf"); setFile(null); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span> PDF
                  </button>
                </div>

                <div
                  className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current.click()}
                >
                  <div className="upload-zone-icon">
                    <span className="material-symbols-outlined">{file ? "check_circle" : "cloud_upload"}</span>
                  </div>
                  <div className="upload-zone-text">
                    {file ? file.name : "Drag & drop or browse file"}
                  </div>
                  <div className="upload-zone-hint">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : `PDF, CSV (Max 10MB)`}
                  </div>
                  <input
                    ref={fileRef} type="file" hidden
                    accept={fileType === "csv" ? ".csv" : ".pdf"}
                    onChange={e => setFile(e.target.files[0])}
                  />
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleUpload} disabled={loading || !file}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cloud_upload</span>
                    {loading ? "Uploading..." : "Upload"}
                  </button>
                  {file && (
                    <button className="btn btn-outline" onClick={() => setFile(null)}>Clear</button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ padding: "16px 0", color: "var(--text-secondary)", fontSize: ".85rem" }}>
                <p>Manual entry is available through the <strong>CSV template</strong>. Download, fill in data, and upload.</p>
                <div style={{ marginTop: 12, padding: 14, background: "var(--bg)", borderRadius: 8, fontSize: ".82rem" }}>
                  <div className="section-title">Expected CSV Columns</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {["title","category","location","severity","peopleAffected","urgency"].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Road Cave-in</td><td>infrastructure</td><td>Pune</td>
                          <td>8</td><td>500</td><td>high</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Upload History */}
        <div className="card">
          <div className="card-title">
            <span className="material-symbols-outlined">history</span>
            Upload History
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-tertiary)", fontSize: ".84rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, display: "block", marginBottom: 6 }}>folder_open</span>
              No uploads yet this session
            </div>
          ) : (
            <div className="upload-history">
              {history.map((item, i) => (
                <div key={i} className="upload-history-item">
                  <div className={`upload-file-icon ${item.type}`}>
                    <span className="material-symbols-outlined icon-filled">
                      {item.type === "pdf" ? "picture_as_pdf" : "table_chart"}
                    </span>
                  </div>
                  <div className="upload-file-info">
                    <div className="upload-file-name">{item.name}</div>
                    <div className="upload-file-time">{timeAgo(item.time)}</div>
                  </div>
                  <div className={`upload-status ${item.status}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      {item.status === "done" ? "check_circle" : item.status === "processing" ? "hourglass_empty" : "error"}
                    </span>
                    {item.status === "done" ? "Done" : item.status === "processing" ? "Processing..." : "Failed"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span className="material-symbols-outlined">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
