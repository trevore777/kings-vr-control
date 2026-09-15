# King’s VR Control

Teacher dashboard and device heartbeat API for a five-headset Meta Quest classroom fleet.

## Current MVP

- Tracks VR-01 through VR-05, models, battery, status and last contact.
- Allocates students/groups and learning activities.
- Starts and ends a classroom VR session.
- Provides the teacher’s Meta casting hand-off.
- Accepts authenticated heartbeat updates from a future Quest companion app.
- Supports optional HTTP Basic authentication for the teacher dashboard.

## Run

Copy `.env.example` to `.env`, set secure credentials, export the values, then run:

```bash
npm start
```

The default address is `http://localhost:3200` and `/health` provides an AWS health check.

## Quest companion heartbeat

Send a POST request to `/api/device/heartbeat` with `X-Device-Key` and JSON such as:

```json
{"id":"VR-03","battery":87,"status":"active","activity":"VR safety investigation","appVersion":"0.1.0"}
```

## AWS deployment

Designed for Node.js 20 behind Nginx and PM2. Persist the `data` directory and set `APP_USERNAME`, `APP_PASSWORD`, and `DEVICE_API_KEY` in the PM2 environment.
