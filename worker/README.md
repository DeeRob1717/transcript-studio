# Transcript Worker

This service is the always-on transcription backend for `transcriptstudiohq.com`.

It accepts jobs from the SaaS app at:

- `POST /api/transcriptions/from-url`

It then:

1. downloads the uploaded media file
2. converts it to WAV with `ffmpeg` when needed
3. runs `whisper.cpp`
4. sends the completed transcript back to the SaaS callback route

## Environment variables

```bash
PORT=8080
TRANSCRIPTION_WORKER_SECRET=your-shared-secret
WHISPER_CPP_EXE=whisper-cli
WHISPER_MODEL_PATH=/app/models/ggml-base.en.bin
FFMPEG_PATH=/usr/bin/ffmpeg
```

Use the same `TRANSCRIPTION_WORKER_SECRET` value in:

- this worker service
- the Vercel SaaS app

## Deploy on an Ubuntu VPS with Docker Compose

Recommended minimum for `ggml-base.en.bin`:

- 1 vCPU
- 4 GB RAM
- 25 GB SSD

That gives the worker enough room for Ubuntu, Docker, `ffmpeg`, the Whisper model, and temporary media files.

1. Copy the `worker` folder and your `.bin` model file to the server.
2. Place the model at `worker/models/ggml-base.en.bin`.
3. Create a `.env` file inside `worker`:

```bash
WORKER_DOMAIN=worker.transcriptstudiohq.com
TRANSCRIPTION_WORKER_SECRET=your-shared-secret
```

4. Point your DNS `A` record for `worker.transcriptstudiohq.com` to the VPS IP address.
5. Start the stack:

```bash
docker compose up -d --build
```

Caddy will automatically provision HTTPS for the `WORKER_DOMAIN`.

## Health check

```bash
curl http://127.0.0.1:8080/api/health
```

## Switch the SaaS app to the server worker

In Vercel production environment variables:

```bash
TRANSCRIPTION_WORKER_URL=https://worker.transcriptstudiohq.com/api/transcriptions/from-url
TRANSCRIPTION_WORKER_SECRET=your-shared-secret
```

Then redeploy the SaaS project.
