# King’s VR Control

Offline-first teacher dashboard for a five-headset Meta Quest classroom fleet. The MacBook installs APKs over USB; each Quest runs installed EDU apps standalone. The dashboard records allocations and installed app versions manually. It does not detect USB headsets or cast through USB.

## Current MVP

- Tracks VR-01 through VR-05, manually checked battery and readiness.
- Records installed EDU apps and versions on each headset.
- Allocates a numeric student code and learning activity in the offline MacBook copy only; AWS stores no student code or name.
- Starts and ends a classroom VR session.
- Provides an optional phone-hotspot casting hand-off.
- Provides a Mac-side, explicit-serial ADB USB installation tool.
- Retains a heartbeat endpoint for a future *networked* Quest companion app; it is not live offline telemetry.
- Supports optional HTTP Basic authentication for the teacher dashboard.

## Run

Copy `.env.example` to `.env`, set secure credentials, export the values, then run:

```bash
npm start
```

The default address is `http://localhost:3200` and `/health` provides an AWS health check. On the teacher MacBook, the Node app and `data/state.json` work without school Wi-Fi or internet; the AWS site does not. No npm dependencies are required. Local Mac and AWS records do not sync automatically. The student number is accepted only on the local MacBook: it must contain 1–12 digits, not an email address or name. Because an email-derived number can be matched to a student, treat the local file as school information and protect/back it up accordingly. In production (`NODE_ENV=production`) the AWS app rejects student numbers and names, removes legacy student fields and clears the old event log once when upgrading. Other free-text activity fields must remain generic—do not enter names there.

## Home preparation and school operation

With IT approval for Developer Mode, sideloading and taking school-owned devices home, download and vet approved APKs at home. Use SideQuest Advanced Installer, Meta Quest Developer Hub, or install Android platform-tools to use the bundled USB tool:

```bash
npm run usb -- list
npm run usb -- install <ADB_SERIAL_FROM_LIST> /absolute/path/to/ApprovedEduApp.apk
```

Accept the USB debugging prompt in the headset. Always identify the intended serial and install one headset at a time; run the app once, then record app/version in the dashboard. Keep APKs in an approved folder, not in GitHub. The USB cable is for installation, not normal play or casting; Quest Link PC-VR is Windows-only.

At school, run this dashboard locally on the MacBook, use the standalone preinstalled apps and allocate VR-01 to VR-05 without Wi-Fi. Back up `data/state.json` under school policy. Optional Meta casting requires the headset and MacBook on the same phone hotspot, the same Meta account in the casting browser, mobile data and a hotspot that permits connected devices to communicate. Test one headset first; casting is not guaranteed offline and should never be assumed to work over USB.

## Quest companion heartbeat

Send a POST request to `/api/device/heartbeat` with `X-Device-Key` and JSON such as:

```json
{"id":"VR-03","battery":87,"status":"active","activity":"VR safety investigation","appVersion":"0.1.0"}
```

## AWS deployment

Designed for Node.js 20 behind Nginx and PM2. Persist the `data` directory and set `APP_USERNAME`, `APP_PASSWORD`, and `DEVICE_API_KEY` in the PM2 environment.


## Year 7–8 learning program

Open `/learn` for four lessons covering VR safety, presence and motion, Beat Saber improvement data, and educational VR design. Worksheet data remains in that browser and is not sent to AWS.
