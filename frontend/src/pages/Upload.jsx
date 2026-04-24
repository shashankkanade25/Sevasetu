import { useRef, useState } from "react";
import { uploadIssues } from "../api";
import { useNavigate } from "react-router-dom";

const UPLOAD_STEPS = ["Uploading", "Parsing", "Validating", "Complete"];

export default function Upload() {
  const [activeTab, setActiveTab] = useState("file");
  const [fileType, setFileType] = useState("csv");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState([]);
  const [successInfo, setSuccessInfo] = useState(null);
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

  const simulateProgress = () => {
    setUploadStep(0); setUploadProgress(0);
    const steps = [
      { step: 0, progress: 30, delay: 300 },
      { step: 1, progress: 55, delay: 600 },
      { step: 2, progress: 80, delay: 400 },
    ];
    let totalDelay = 0;
    steps.forEach(({ step, progress, delay }) => {
      totalDelay += delay;
      setTimeout(() => { setUploadStep(step); setUploadProgress(progress); }, totalDelay);
    });
    return totalDelay;
  };

  const handleUpload = async () => {
    if (!file) return showToast("Please select a file first", "error");

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setSuccessInfo(null);

    const entry = { name: file.name, type: fileType, time: new Date(), status: "processing" };
    setHistory(prev => [entry, ...prev]);

    const progressDelay = simulateProgress();

    try {
      const response = await uploadIssues(formData);
      const { successCount, failedCount, errors } = response.data;

      setTimeout(() => {
        setUploadStep(3);
        setUploadProgress(100);

        if (failedCount > 0 && successCount === 0) {
          showToast(`Upload failed: ${failedCount} rows invalid`, "error");
          console.error("Upload Errors:", errors);
        } else if (failedCount > 0) {
          showToast(`Partial success: ${successCount} uploaded, ${failedCount} failed`, "error");
          console.warn("Upload Errors:", errors);
        } else {
          showToast(`✅ ${successCount} issues uploaded successfully`, "success");
        }

        setSuccessInfo({ count: successCount, type: fileType });
      }, progressDelay + 200);

      entry.status = (failedCount > 0 && successCount === 0) ? "error" : "done";
      setHistory(prev => [...prev]);
      setFile(null);
    } catch (err) {
      entry.status = "error";
      setHistory(prev => [...prev]);
      const errMsg = err.response?.data?.error || "Upload failed";
      showToast(errMsg, "error");
      setUploadStep(0);
      setUploadProgress(0);
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
          <span className="material-symbols-outlined">cloud_upload</span>
          Data Upload
        </h1>
        <p>Import community needs data from CSV reports or PDF documents into the priority engine.</p>
      </div>

      <div className="dash-grid">
        {/* Left: Upload */}
        <div>
          <div className="card animate-in">
            <div className="card-title">
              <span className="material-symbols-outlined">upload_file</span>
              Upload New Data
            </div>

            {/* Tabs */}
            <div className="tab-bar">
              <button className={`tab-item ${activeTab === "file" ? "active" : ""}`}
                onClick={() => setActiveTab("file")}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>description</span>
                Upload File
              </button>
              <button className={`tab-item ${activeTab === "manual" ? "active" : ""}`}
                onClick={() => setActiveTab("manual")}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>edit_note</span>
                Manual Entry
              </button>
            </div>

            {activeTab === "file" ? (
              <>
                {/* File Type Selector */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  <button className={`btn btn-sm ${fileType === "csv" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => { setFileType("csv"); setFile(null); setSuccessInfo(null); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>table_chart</span> CSV
                  </button>
                  <button className={`btn btn-sm ${fileType === "pdf" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => { setFileType("pdf"); setFile(null); setSuccessInfo(null); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span> PDF
                  </button>
                </div>

                {/* Drop Zone */}
                <div
                  className={`upload-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current.click()}
                >
                  <div className="upload-zone-icon">
                    <span className="material-symbols-outlined">
                      {file ? "check_circle" : dragOver ? "file_download" : "cloud_upload"}
                    </span>
                  </div>
                  <div className="upload-zone-text">
                    {file ? file.name : "Drag & drop or click to browse"}
                  </div>
                  <div className="upload-zone-hint">
                    {file ? `${(file.size / 1024).toFixed(1)} KB · ${fileType.toUpperCase()}` : `Supports ${fileType.toUpperCase()} files up to 10MB`}
                  </div>
                  <input
                    ref={fileRef} type="file" hidden
                    accept={fileType === "csv" ? ".csv" : ".pdf"}
                    onChange={e => { setFile(e.target.files[0]); setSuccessInfo(null); }}
                  />
                </div>

                {/* Upload Progress */}
                {loading && (
                  <div className="upload-progress animate-in">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {UPLOAD_STEPS[uploadStep]}...
                      </span>
                      <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{uploadProgress}%</span>
                    </div>
                    <div className="upload-progress-bar-wrap">
                      <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <div className="upload-progress-steps">
                      {UPLOAD_STEPS.map((step, i) => (
                        <div key={step} className={`upload-step ${i === uploadStep ? "active" : ""} ${i < uploadStep ? "done" : ""}`}>
                          <span className="material-symbols-outlined">
                            {i < uploadStep ? "check_circle" : i === uploadStep ? "pending" : "radio_button_unchecked"}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Info */}
                {successInfo && !loading && (
                  <div className="animate-in" style={{
                    marginTop: 16,
                    padding: 20,
                    background: "var(--emerald-50)",
                    border: "1px solid var(--emerald-100)",
                    borderRadius: "var(--radius)",
                    textAlign: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: "var(--emerald-500)", display: "block", marginBottom: 8 }}>
                      task_alt
                    </span>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                      Upload Successful!
                    </div>
                    <div style={{ fontSize: ".82rem", color: "var(--text-secondary)", marginTop: 4 }}>
                      {successInfo.count} {successInfo.type === "csv" ? "issues imported" : "issue extracted"} and prioritized.
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => navigate("/")}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
                      View Dashboard
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                {!successInfo && (
                  <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={loading || !file}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cloud_upload</span>
                      {loading ? "Processing..." : "Upload & Process"}
                    </button>
                    {file && !loading && (
                      <button className="btn btn-outline" onClick={() => { setFile(null); setSuccessInfo(null); }}>Clear</button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "16px 0", color: "var(--text-secondary)", fontSize: ".85rem" }}>
                <p>Manual entry is available through the <strong>CSV template</strong>. Download, fill in your data, and upload.</p>
                <div style={{ marginTop: 16, padding: 18, background: "var(--bg-subtle)", borderRadius: "var(--radius)", border: "1px solid var(--border-light)" }}>
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
        <div className="card animate-in">
          <div className="card-title">
            <span className="material-symbols-outlined">history</span>
            Upload History
          </div>
          {history.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">folder_open</span>
              <div className="empty-text">No uploads yet this session</div>
              <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 4 }}>
                Upload a CSV or PDF to get started
              </div>
            </div>
          ) : (
            <div className="upload-history">
              {history.map((item, i) => (
                <div key={i} className="upload-history-item animate-in">
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
                    {item.status === "done" ? "Done" : item.status === "processing" ? "Processing" : "Failed"}
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
