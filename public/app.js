const state = {
  selectedFile: null,
  jobs: [],
};

const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const uploadButton = document.getElementById("uploadButton");
const selectedFileBox = document.getElementById("selectedFile");
const statusBox = document.getElementById("statusBox");
const jobsList = document.getElementById("jobsList");
const jobTemplate = document.getElementById("jobTemplate");

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString();
}

function setStatus(kind, title, detail) {
  statusBox.classList.remove("hidden");
  statusBox.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
  statusBox.dataset.kind = kind;
}

function clearStatus() {
  statusBox.classList.add("hidden");
  statusBox.innerHTML = "";
  delete statusBox.dataset.kind;
}

function renderSelectedFile() {
  if (!state.selectedFile) {
    selectedFileBox.classList.add("hidden");
    uploadButton.disabled = true;
    return;
  }

  selectedFileBox.classList.remove("hidden");
  selectedFileBox.innerHTML = `
    <strong>${state.selectedFile.name}</strong>
    <span>${formatFileSize(state.selectedFile.size)} | ${state.selectedFile.type || "unknown type"}</span>
  `;
  uploadButton.disabled = false;
}

function renderJobs() {
  jobsList.innerHTML = "";

  if (state.jobs.length === 0) {
    jobsList.innerHTML = `<div class="job-card"><p class="job-meta">No transcripts yet. Your completed jobs will show up here.</p></div>`;
    return;
  }

  for (const job of state.jobs) {
    const node = jobTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".job-title").textContent = job.originalFileName || "Untitled media";
    node.querySelector(".job-meta").textContent =
      `${formatDate(job.createdAtUtc)} | ${formatFileSize(job.sizeBytes || 0)}`;

    const status = node.querySelector(".job-status");
    status.textContent = job.status || "unknown";
    status.classList.add((job.status || "unknown").toLowerCase());

    const transcript = node.querySelector(".job-transcript");
    if (job.status === "completed") {
      transcript.textContent = job.transcriptText || "Transcript completed, but no text was returned.";
    } else if (job.status === "failed") {
      transcript.textContent = job.error || "Transcription failed.";
    } else {
      transcript.textContent = "Processing...";
    }

    jobsList.appendChild(node);
  }
}

async function loadJobs() {
  try {
    const response = await fetch("/api/jobs");
    if (!response.ok) {
      throw new Error(`Could not load jobs (${response.status})`);
    }
    state.jobs = await response.json();
    renderJobs();
  } catch (error) {
    jobsList.innerHTML = `<div class="job-card"><p class="job-meta">${error.message}</p></div>`;
  }
}

function selectFile(file) {
  state.selectedFile = file;
  clearStatus();
  renderSelectedFile();
}

async function uploadFile() {
  if (!state.selectedFile) return;

  uploadButton.disabled = true;
  setStatus("processing", "Uploading", "Your file is being sent to the transcription backend.");

  const file = state.selectedFile;
  const url = `/api/transcriptions?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || "application/octet-stream")}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `Upload failed (${response.status})`);
    }

    setStatus("completed", "Transcript ready", "Your file was processed successfully.");
    state.selectedFile = null;
    fileInput.value = "";
    renderSelectedFile();
    await loadJobs();
  } catch (error) {
    setStatus("failed", "Upload failed", error.message);
    uploadButton.disabled = false;
  }
}

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    selectFile(file);
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  const [file] = event.dataTransfer.files;
  if (file) {
    selectFile(file);
  }
});

uploadButton.addEventListener("click", uploadFile);

loadJobs();
