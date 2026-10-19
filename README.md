# 📞 On-Ground.ai Call Centre

An enterprise-grade sales call centre and lead triage platform designed for high-velocity sales teams. Built with **React 18**, **Vite 5**, **Recharts**, a **Groq-powered conversational AI voice agent (Avani)**, and **Twilio telephony integration**, styled in an ultra-modern dark glassmorphism design.

---

## 📑 Table of Contents
1. [Executive Overview](#-executive-overview)
2. [Calling Architecture (Deep Dive)](#-calling-architecture-deep-dive)
   - [Human-to-Human Calling](#1-human-to-human-calling)
   - [Human-to-AI Calling](#2-human-to-ai-calling)
   - [Future Telephony Roadmap & Requirements](#3-future-telephony-roadmap--requirements)
3. [Core Platform Features](#-core-platform-features)
4. [Tech Stack](#-tech-stack)
5. [Quick Start & Local Setup](#-quick-start--local-setup)
6. [Environment Configuration](#-environment-configuration)
7. [Testing & Build Validation](#-testing--build-validation)
8. [Production Deployment (Vercel)](#-production-deployment-vercel)

---

## 🌟 Executive Overview

On-Ground.ai Call Centre streamlines outbound lead engagement and callback workflows (optimized for consumer products like ergonomic mattresses and furniture). It combines:
- **Strict 3-Tier Priority Dashboard**: Missed Calls $\rightarrow$ Scheduled Follow-ups $\rightarrow$ Completed.
- **Dual Telephony Engines**: Native browser/phone dialer and Twilio carrier-grade bridge calls.
- **Real-Time Voice AI Agent**: Powered by **Groq** ultra-low-latency LLM inference and the Web Speech API with natural Indian English (`en-IN`) cadence.
- **Test Call Studio & Manual Dialer**: Enter any custom customer phone number to test calls directly from the web UI and inspect live logs with transcripts and buying signal extraction.

---

## 📞 Calling Architecture (Deep Dive)

The system is architected around two primary calling paradigms: **Human-to-Human** and **Human-to-AI**.

```
                           ┌──────────────────────────────────────────────┐
                           │            On-Ground.ai Web Client           │
                           └──────────────────────┬───────────────────────┘
                                                  │
                 ┌────────────────────────────────┴───────────────────────────────┐
                 ▼                                                                ▼
    [Human-to-Human Channels]                                       [Human-to-AI Channels]
  ┌──────────────────────────────┐                                ┌──────────────────────────────┐
  │ 1. Native Click-to-Dial      │                                │ 1. In-Browser AI Voice Call  │
  │    (tel: protocol + timer)   │                                │    (Web Speech + Groq LLM)   │
  ├──────────────────────────────┤                                ├──────────────────────────────┤
  │ 2. Twilio PSTN Call-Bridge   │                                │ 2. Twilio PSTN Voice Agent   │
  │    (/api/call + /api/connect)│                                │    (/api/ai-call + /ai-voice)│
  └──────────────────────────────┘                                └──────────────────────────────┘
```

---

### 1. Human-to-Human Calling

Designed for human sales agents placing real voice calls to prospects.

#### A. Native Click-to-Dial (`tel:` Protocol)
* **Status**: **Fully implemented and operational out of the box.**
* **How It Works**:
  1. The agent clicks **"📱 Call from my phone"** on any lead card or dialer.
  2. The browser launches the device's native telephony handler via `<a href="tel:+91...">`.
  3. On mobile devices, this launches the default SIM phone dialer. On desktop browsers, it connects to configured softphones (FaceTime, Skype, Teams).
  4. **Automatic Return Detection**: The utility `pendingCall.js` listens to window `visibilitychange` events. When the agent navigates away to place the call and returns to the browser tab, the system automatically presents the **Call Outcome Sheet**.
  5. The agent logs the outcome (`No Answer`, `Spoke - Follow-up Needed`, or `Spoke - All Done`), which automatically updates the priority queue and logs the record.
* **Fallback**: A **"📋 Copy Number"** button allows manual pasting into desktop VoIP or physical handsets.

#### B. Twilio Two-Leg Carrier Bridge Call ("Call me, then connect")
* **Status**: **Backend endpoints and client controls implemented.**
* **How It Works**:
  1. Agent clicks **"🔄 Call me, then connect"** in the web UI.
  2. Frontend sends `{ agentPhone, customerPhone }` to `/api/call`.
  3. The server validates phone numbers against E.164 formatting (`+91...`) and verifies the customer number against the server-side `ALLOWED_NUMBERS` whitelist.
  4. **Leg 1**: Twilio REST API dials the agent's phone (`agentPhone`).
  5. **Leg 2**: As soon as the agent answers, Twilio executes TwiML from `/api/connect-customer`:
     ```xml
     <Response>
       <Dial>+919876543210</Dial>
     </Response>
     ```
     Twilio then dials the customer and bridges both audio streams together. Neither party sees private personal numbers if a Twilio caller ID is configured.
* **Requirements to Run Live**:
  - Valid Twilio Account SID (`TWILIO_SID`), Auth Token (`TWILIO_TOKEN`), and purchased number (`TWILIO_FROM`).
  - Whitelisted numbers added to `ALLOWED_NUMBERS` in `.env`.

---

### 2. Human-to-AI Calling

Designed for automated AI sales assistance, practice simulations, and customer pre-qualification.

#### A. Interactive In-Browser AI Voice Call (Groq AI + Speech API)
* **Status**: **Fully implemented, tested, and operational.**
* **Persona**: **Avani** — Empathetic, persuasive sales consultant at On-Ground.ai Bengaluru.
* **How It Works**:
  1. Click **"🤖 Start AI call"** on any lead card or inside the **Test Call Studio**.
  2. The **AI Call Session** modal opens with the lead's exact name, product, and scenario.
  3. Click **"▶ Start AI Call"**; the browser's `SpeechSynthesis` greets the lead in standard Indian English (`en-IN`):
     > *"Hello Arjun, this is Avani from On-Ground AI. Is this a good time to talk about your enquiry for the Ortho GRID Mattress?"*
  4. The customer speaks into the microphone (transcribed in real time via `SpeechRecognition`) or types into the conversation box.
  5. The client dispatches conversation history to `/api/ai-chat`.
  6. The backend queries the **Groq API** (`https://api.groq.com/openai/v1/chat/completions`) using model `openai/gpt-oss-20b` or Llama 3 with streaming sub-second latency (~300–500ms).
  7. Groq responds with concise, spoken-length guidance (under 40 words) addressing 0% EMI (6–12 months), 10-year warranty, 100-night trial, and showroom visits.
  8. Avani synthesizes the response out loud and prompts the customer for their next question.
  9. Upon ending the call (**"🔴 End & Save Call"**), the full transcript, duration, customer needs, and buying signals are saved to `localStorage` and displayed under **Recent Calls**.
* **Resilience**: If offline or if the Groq key is unreachable, the system automatically falls back to an embedded keyword regex engine.

#### B. Twilio Outbound PSTN AI Voice Call
* **Status**: **Backend architecture implemented (`/api/ai-call` & `/api/ai-voice`).**
* **How It Works**:
  1. POST request to `/api/ai-call` dials the customer's phone over public phone networks.
  2. Twilio connects to `/api/ai-voice`, generating dynamic TwiML with `<Say language="en-IN">` and `<Gather input="speech">`.
  3. Twilio speech-to-text streams caller responses back to `/api/ai-voice`, which invokes Groq AI to generate Avani's next spoken sentence.
  4. Once finalized, the call hangs up and records are saved.

---

### 3. Future Telephony Roadmap & Requirements

To transition from browser-simulated and server-bridged telephony to a fully productionized telecom stack:

| Telephony Feature | Current Status | How to Implement in Future | Required Stack / Method |
|---|---|---|---|
| **In-Browser WebRTC Softphone** | Click-to-dial launches device dialer | Embed direct microphone/speaker VoIP inside the browser tab without dialing the agent's cell phone | **Twilio Voice Web SDK** (`@twilio/voice-sdk`). Backend endpoint generates capability tokens via `Twilio.jwt.AccessToken`. Frontend initializes `Device.setup(token)` for browser-to-PSTN calls. |
| **Real-Time Full-Duplex Voice AI** | Turn-based browser speech + Groq API | Sub-400ms interruptible AI voice where caller can interrupt ("barge-in") the AI mid-sentence | **Twilio Media Streams (WebSocket)** $\rightarrow$ **Node.js / FastAPI Server** $\rightarrow$ **Deepgram Nova-2** (STT, ~120ms) $\rightarrow$ **Groq LLM** (~180ms) $\rightarrow$ **Cartesia / ElevenLabs** (Neural TTS, ~100ms). |
| **Call Recording & Transcription** | Browser speech saved to local DB | Record live PSTN audio and store high-fidelity MP3 recordings and compliance transcripts | Set `record: true` in Twilio Calls API. Webhook callback receives `RecordingUrl`. Send recording to Whisper API for diarized transcription. |
| **PSTN Inbound IVR Number** | Simulated in Pulse & Incoming queues | Inbound phone number where incoming customer calls ring available agents or AI | Purchase a Twilio Local/Toll-Free Indian or international DID. Point webhook to `/api/inbound-ivr` returning TwiML `<Gather>` menu or AI agent. |

---

## 💻 Core Platform Features

### 1. Priority Triage Dashboard
* **1. Missed Calls (Red Alert)**: Dropped or unreturned inquiries.
* **2. Follow-ups (Pending Due Date)**: Contacts spoken to with actionable next steps.
* **3. Completed Tasks (Green Check)**: Finalized sales or resolved inquiries.
* **Strict State Transition Machine**:
  - `Missed` + `No answer` $\rightarrow$ Stays in `Missed`, increment attempts count, auto-sets due date to tomorrow.
  - `Missed` / `Follow-up` + `Spoke, follow-up needed` $\rightarrow$ Moves to `Follow-up` (mandatory date + note).
  - `Missed` / `Follow-up` + `Spoke, all done` $\rightarrow$ Moves to `Completed` (final state).

### 2. Test Call Studio & Manual Dialer
* Integrated directly on the Dashboard side column.
* Accepts any manual Indian or international phone number, contact name, and product.
* Allows immediate one-click testing of **Groq AI voice calls**, native dialer links, or Twilio bridging.
* **Live On-Card Records**: Shows the last 4 calls logged with one-click **"▼ View"** transcript and AI signal inspection.

### 3. Reactive Storage & State Management
* Built on a custom repository pattern (`src/data/db.js`) persisting under `localStorage["oncall.db.v1"]`.
* Zero-latency UI updates using React 18's `useSyncExternalStore` hooks (`src/data/hooks.js`).
* **1-Click Reset**: "🔄 Reset demo data" in the top bar instantly restores seed data.

### 4. Interactive Calendar
* Monthly schedule grid with orange indicators on dates with pending callbacks.
* Selecting any date displays a dedicated task list with direct call actions.

### 5. Pulse Team Chat
* Internal communication stream with automated **AvaniBot** alerts on incoming leads.

---

## 🛠 Tech Stack

- **Frontend Framework**: React 18.3 (`react`, `react-dom`)
- **Routing**: React Router v7 (`react-router-dom`)
- **Build Tooling & Dev Server**: Vite 5.4 with custom API middleware
- **Analytics & Data Viz**: Recharts 2.12
- **Testing Engine**: Vitest 2.0
- **AI Engine**: Groq API (`openai/gpt-oss-20b` / Llama 3 models)
- **Speech Engine**: Web Speech API (`SpeechSynthesis` & `SpeechRecognition`)
- **Telephony API**: Twilio Voice & TwiML REST API
- **Styling Architecture**: Vanilla CSS with Design System Tokens (`tokens.css` + `styles.css`), dark glassmorphism theme (`#080c14`). No Tailwind.

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: Version 18.0 or higher.
- **Package Manager**: npm (bundled with Node).

### 2. Installation
Clone or extract the repository, then install dependencies:
```bash
git clone <repo-url>
cd oncall
npm install
```

### 3. Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your API keys (see [Environment Configuration](#-environment-configuration)).

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge (recommended for Web Speech API support).

---

## ⚙️ Environment Configuration

Configuration variables are stored in `.env` (git-ignored for security):

```ini
# Twilio Credentials for Outbound PSTN & AI Voice Calls
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=your_twilio_auth_token_here
TWILIO_FROM=+12345678901

# Whitelisted E.164 phone numbers permitted to receive calls (comma-separated)
ALLOWED_NUMBERS=+919999900001,+919999900002

# Groq API Key for AI Voice Agent (Avani)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Variable Details:
| Variable | Required For | Description |
|---|---|---|
| `GROQ_API_KEY` | **AI Voice Agent** | Groq Cloud API key. Powers real-time conversational responses from Avani in `/api/ai-chat`. |
| `ALLOWED_NUMBERS` | **Security / Twilio** | Comma-separated list of permitted destination phone numbers. Endpoints reject unlisted numbers. |
| `TWILIO_SID` | **Twilio PSTN Calling** | Twilio Account SID from the Twilio Console. |
| `TWILIO_TOKEN` | **Twilio PSTN Calling** | Twilio Auth Token. |
| `TWILIO_FROM` | **Twilio PSTN Calling** | Twilio phone number purchased or verified on your account. |

> **Security Note**: Never prefix secrets with `VITE_`. Vite exposes `VITE_` variables to the client-side bundle. All telephony and Groq API calls are handled server-side in `/api/*` or the Vite dev-server proxy.

---

## 🧪 Testing & Build Validation

### Running Unit Tests
The test suite validates E.164 phone number formatting and the state machine transition rules:
```bash
npm test
```
*Vitest runs 7 automated unit tests across `phone.test.js` and `db.test.js`.*

### Building Production Bundle
```bash
npm run build
```
Generates a minified production build in `dist/`.

---

## 🚢 Production Deployment (Vercel)

The `/api` folder contains native Vercel serverless functions:
- `api/ai-chat.js`: Groq AI conversation handler.
- `api/call.js`: Outbound Twilio call bridge.
- `api/connect-customer.js`: TwiML dialing instruction.
- `api/ai-call.js`: Outbound AI phone call trigger.
- `api/ai-voice.js`: TwiML interactive speech gatherer.

### Steps to Deploy:
1. Initialize git and commit:
   ```bash
   git add .
   git commit -m "feat: On-Ground.ai Call Centre with Groq AI and Twilio"
   ```
2. Push to your GitHub repository.
3. Import the project into [Vercel](https://vercel.com).
4. Add environment variables in **Vercel Project Settings $\rightarrow$ Environment Variables**:
   - `GROQ_API_KEY`
   - `TWILIO_SID`
   - `TWILIO_TOKEN`
   - `TWILIO_FROM`
   - `ALLOWED_NUMBERS`
5. Deploy! Vercel will automatically serve the Vite frontend and expose `/api/*` serverless functions.
