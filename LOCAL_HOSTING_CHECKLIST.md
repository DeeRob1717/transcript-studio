# Keep Your PC-Based Worker Running

This is the fastest way to let users use your app while the transcription worker stays on your own PC.

## What must stay running

Your transcription system only works while all of these are true:

1. your PC is turned on
2. your PC is connected to the internet
3. the Whisper worker is running
4. the tunnel is running

## Fast startup

Double-click:

- [START_PUBLIC_WORKER.bat](/C:/Users/Administrator/Documents/transcript/START_PUBLIC_WORKER.bat)

That opens:

1. the local Whisper worker on `http://localhost:8080`
2. an `ngrok` tunnel that exposes it to the internet

## Windows settings

In Windows:

1. Open `Settings`
2. Go to `System`
3. Go to `Power & battery`
4. Open `Screen and sleep`
5. Set all sleep options to `Never`

Also:

- keep the PC plugged into power
- keep the router on
- use Ethernet if possible instead of Wi-Fi

## Health check

Open this in your browser on the PC:

- `http://localhost:8080/api/health`

If the worker is healthy, you should get JSON back.

## Important tunnel note

If the ngrok URL changes, your website must be updated with the new worker URL in Vercel:

```text
TRANSCRIPTION_WORKER_URL=https://YOUR-NGROK-URL/api/transcriptions/from-url
```

If your current ngrok window stays open, the current URL keeps working.

## Best practical use

This is okay for:

- testing with early users
- demos
- soft launch

This is not ideal for:

- reliable 24/7 paid production
- larger numbers of users
- long-term business use
