import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 8080);
const uploadsDir = path.join(__dirname, "data", "uploads");
const jobsDir = path.join(__dirname, "data", "jobs");
const workerSecret = process.env.TRANSCRIPTION_WORKER_SECRET || "";
const whisperExecutable = process.env.WHISPER_CPP_EXE || "whisper-cli";
const whisperModelPath =
  process.env.WHISPER_MODEL_PATH || path.join(__dirname, "models", "ggml-base.en.bin");
const ffmpegExecutable = process.env.FFMPEG_PATH || "ffmpeg";

await mkdir(uploadsDir, { recursive: true });
await mkdir(jobsDir, { recursive: true });

function json(res, statusCode, body) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length
  });
  res.end(payload);
}

function sanitizeFileName(name) {
  return path.basename(name || "upload.bin").replace(/[^\w.\-]+/g, "_");
}

function inferContentType(fileName, fallback) {
  if (fallback?.trim()) {
    return fallback;
  }

  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".wav":
      return "audio/wav";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".ogg":
      return "audio/ogg";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    case ".webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}

function isVideoFile(contentType, fileName) {
  return contentType.startsWith("video/") || [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg", ".mpg", ".m4v"].includes(path.extname(fileName).toLowerCase());
}

function isWavFile(contentType, fileName) {
  return contentType === "audio/wav" || path.extname(fileName).toLowerCase() === ".wav";
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function ensureWhisperPrerequisites() {
  const modelCheck = await stat(whisperModelPath).catch(() => null);

  if (!modelCheck) {
    throw new Error(`Whisper model not found at "${whisperModelPath}".`);
  }
}

async function downloadToFile(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download media file (${response.status} ${response.statusText}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(targetPath, Buffer.from(arrayBuffer));

  return inferContentType(path.basename(targetPath), response.headers.get("content-type"));
}

async function prepareTranscriptionSource(inputPath, originalFileName, contentType, workingDir) {
  if (isWavFile(contentType, originalFileName) && !isVideoFile(contentType, originalFileName)) {
    return { filePath: inputPath, generatedTempFile: false };
  }

  const wavPath = path.join(workingDir, `${path.parse(originalFileName).name}.wav`);
  const ffmpegResult = await runCommand(ffmpegExecutable, [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    wavPath
  ]);

  if (ffmpegResult.code !== 0) {
    throw new Error(`ffmpeg failed to prepare audio.\n${ffmpegResult.stderr || ffmpegResult.stdout}`.trim());
  }

  return { filePath: wavPath, generatedTempFile: true };
}

async function transcribeWithWhisper(filePath, jobId, workingDir) {
  const outputPrefix = path.join(workingDir, `transcript_${jobId}`);
  const outputTextPath = `${outputPrefix}.txt`;
  const result = await runCommand(whisperExecutable, [
    "-m",
    whisperModelPath,
    "-f",
    filePath,
    "--output-txt",
    "--output-file",
    outputPrefix
  ]);

  let transcriptText = "";
  try {
    transcriptText = (await readFile(outputTextPath, "utf8")).trim();
  } catch {}

  if (!transcriptText) {
    const combined = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(combined || `whisper.cpp exited with code ${result.code} and produced no transcript.`);
  }

  return transcriptText;
}

async function sendCallback(callbackUrl, payload) {
  if (!callbackUrl) {
    return;
  }

  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": workerSecret
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Callback failed with status ${response.status}.`);
  }
}

async function processTranscriptionJob(payload) {
  const safeName = sanitizeFileName(payload.originalFileName);
  const workingDir = await mkdtemp(path.join(tmpdir(), "transcript-worker-"));
  const downloadedPath = path.join(workingDir, safeName);

  try {
    await ensureWhisperPrerequisites();
    const contentType = await downloadToFile(payload.mediaUrl, downloadedPath);
    const source = await prepareTranscriptionSource(downloadedPath, safeName, contentType, workingDir);
    const transcriptText = await transcribeWithWhisper(source.filePath, payload.jobId, workingDir);

    await sendCallback(payload.callbackUrl, {
      jobId: payload.jobId,
      status: "COMPLETED",
      transcriptText,
      transcriptFormat: "text"
    });
  } catch (error) {
    await sendCallback(payload.callbackUrl, {
      jobId: payload.jobId,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Transcription failed."
    }).catch(() => {});
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    json(res, 404, { error: "Not found." });
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, {
      status: "ok",
      provider: "whisper.cpp",
      whisperExecutable,
      whisperModelPath
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/transcriptions/from-url") {
    if (workerSecret && req.headers["x-worker-secret"] !== workerSecret) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    let payload;
    try {
      payload = await readJsonBody(req);
    } catch {
      json(res, 400, { error: "Invalid JSON payload." });
      return;
    }

    if (!payload?.jobId || !payload?.mediaUrl || !payload?.originalFileName) {
      json(res, 400, { error: "Missing jobId, mediaUrl, or originalFileName." });
      return;
    }

    void processTranscriptionJob(payload);
    json(res, 202, {
      success: true,
      jobId: payload.jobId,
      status: "accepted"
    });
    return;
  }

  json(res, 404, { error: "Route not found." });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Transcript worker running on http://0.0.0.0:${port}`);
});
