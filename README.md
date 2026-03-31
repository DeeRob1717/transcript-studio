# Transcript Studio

Transcript Studio is a self-hosted web app plus API backend for uploading audio or video files and transcribing them automatically.

This version is fully free to run after setup:

- Backend: PowerShell + raw TCP HTTP server
- Frontend: static HTML, CSS, and JavaScript
- Transcription provider: local `whisper.cpp`
- Storage: local JSON files and uploaded media on disk

## Features

- Drag-and-drop uploads from the browser
- Fully offline transcription with no API key and no usage charges
- Transcript history and job detail lookup
- Simple REST API you can extend for your own apps
- Video and compressed audio support when `ffmpeg` is installed

## Project structure

- `server.ps1` - web server and API backend
- `public/index.html` - main web interface
- `public/styles.css` - UI styling
- `public/app.js` - upload and transcript history logic
- `models/` - local Whisper model files
- `data/` - runtime storage for uploads and job JSON files
- `start-free.bat` - simple startup helper

## What you need to install

1. `whisper.cpp`
2. A Whisper model `.bin` file
3. `ffmpeg` if you want mp3, m4a, mp4, mov, webm, or most non-WAV formats to work

Reference: the official `whisper.cpp` repository documents `whisper-cli` for local transcription and notes that audio often needs conversion to WAV first. [whisper.cpp](https://github.com/ggml-org/whisper.cpp)

## Recommended setup on this project

Place your model file here:

```text
C:\Users\Administrator\Documents\transcript\models\ggml-base.en.bin
```

If your executable or model live elsewhere, set:

```powershell
$env:WHISPER_CPP_EXE = "C:\path\to\whisper-cli.exe"
$env:WHISPER_MODEL_PATH = "C:\path\to\ggml-base.en.bin"
```

Optional:

```powershell
$env:PORT = "8080"
```

## Start the app

PowerShell:

```powershell
cd C:\Users\Administrator\Documents\transcript
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Or double-click:

```text
start-free.bat
```

Then open:

```text
http://localhost:8080
```

## API

### Health

```http
GET /api/health
```

### Create transcription job

Send the raw file bytes in the request body.

```http
POST /api/transcriptions?filename=meeting.wav&contentType=audio/wav
Content-Type: application/octet-stream
```

### List jobs

```http
GET /api/jobs
```

### Get one job

```http
GET /api/jobs/{id}
```

## Notes

- Uploaded files are stored locally under `data/uploads/`.
- Job metadata is stored under `data/jobs/`.
- `GET /api/health` shows whether `whisper.cpp`, the model file, and `ffmpeg` were found.
- If `ffmpeg` is missing, WAV uploads work best. Most other formats will fail with a clear setup message.
- `ggml-base.en.bin` is a good English starter model. You can point `WHISPER_MODEL_PATH` to a larger or multilingual model later.

