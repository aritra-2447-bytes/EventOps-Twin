# EventOps Twin (THE GRID)
### Congestion Prediction & Tactical Deployment Command Center

**EventOps Twin** (codenamed **THE GRID**) is an advanced, full-stack incident command center prototype designed for the Metropolitan Traffic Command Center (specifically modeled for Bengaluru, India). Built as a compliance prototype for the Flipkart Gridlock challenge, the application bridges the gap between raw, messy natural language traffic feeds and structured machine-learning telemetry to optimize police resource deployment, predict gridlock escalation, and streamline incident clearing workflows.

---

## Core Intention & Architecture

When traffic incidents occur (such as accidents, waterlogging, or spontaneous protests), reports are often delivered via chaotic radio feeds or unstructured text. **EventOps Twin** serves as the intelligence layer that takes these raw inputs, structurally categorizes them, scores their potential network risk, and recommends optimal spatial deployment strategies.

```text
[ Messy Natural Language Incident Report ]
                    │
                    ▼
       [ Resilient NLP Parsing Layer ] ────► (Failsafe Regex Heuristics fallback)
                    │
                    ▼
    [ Structured Feature Vectors (JSON) ]
                    │
                    ▼
     [ Impact Prediction Engine (ML) ] ────► [ Gemini Failsafe Refinement Layer ]
                    │
                    ▼
  ┌─────────────────┴─────────────────┐
  ▼                                   ▼
[Geospatial Command Map]     [Tactical Station Dispatch Optimization]
```
___

## 🚀 Tech Stack


<table>
<tr>
<th width="25%">Frontend</th>
<th width="25%">Backend</th>
<th width="25%">ML & AI Pipeline</th>
<th width="25%">Infrastructure</th>
</tr>

<tr>
<td>

<img src="https://skillicons.dev/icons?i=react" width="50"/> React

<br><br>

<img src="https://skillicons.dev/icons?i=vite" width="50"/> Vite

<br><br>

<img src="https://skillicons.dev/icons?i=ts" width="50"/> TypeScript

</td>

<td>

<img src="https://skillicons.dev/icons?i=nodejs" width="50"/> Node.js

<br><br>

<img src="https://skillicons.dev/icons?i=express" width="50"/> Express

<br><br>

<img src="https://skillicons.dev/icons?i=git" width="50"/> Git

</td>

<td>

<img src="https://skillicons.dev/icons?i=python" width="50"/> Python

<br><br>

<img src="https://cdn.simpleicons.org/anaconda/44A833" width="50"/> Conda

<br><br>

<img src="https://cdn.simpleicons.org/scikitlearn/F7931E" width="50"/> Scikit-Learn

</td>

<td>

<img src="https://skillicons.dev/icons?i=fastapi" width="50"/> FastAPI

<br><br>

<img src="https://skillicons.dev/icons?i=docker" width="50"/> Docker

<br><br>

<img src="https://skillicons.dev/icons?i=vercel" width="50"/> Vercel

</td>
</tr>
</table>


## ⚙️ Configuration & Environment Setup

The application dynamically scales down its capabilities gracefully depending on available API credentials.

Create a `.env` file in the root directory:

```env
# Server Operating Port
PORT=3000

# MapTiler Geocoding & Map Vector Key
# (Default fallback embedded if left blank)
MAPTILER_API_KEY=your_maptiler_api_key_here

# Generative AI Core Key
# Enables resilient parsing and failsafe correction
GEMINI_API_KEY=your_gemini_api_key_here

# External Python/FastAPI Machine Learning Model Base URL
# If left undefined, the system automatically routes tasks
# through the Deterministic Smart Fallback engine
PREDICTION_API_BASE_URL=http://localhost:8000
```

---

## 🚀 Installation & Launch Procedures

### Prerequisites

Ensure the following are installed on your system:

* Node.js (v18+)
* npm

### 1️⃣ Dependency Installation

Install all frontend and backend dependencies:

```bash
npm install
```

### 2️⃣ Running in Development Mode

Launches the Express API server through `server.ts` using `tsx` while Vite serves the frontend with Hot Module Replacement (HMR).

```bash
npm run dev
```

After startup, open:

```text
http://localhost:3000
```

### 3️⃣ Production Build & Launch

Compile optimized production bundles and start the server:

```bash
# Build application
npm run build

# Start production server
npm run start
```

---

## 📦 Project Features

### 📝 Event Intake Gateway

Transforms unstructured traffic reports into structured operational data.

**Capabilities**

* Natural language incident parsing
* Structured event form editing
* Automatic field extraction
* Validation and correction workflows
* Planned vs. unplanned event classification

---

### 📊 Operational Impact Dashboard

Provides predictive operational intelligence for command center operators.

**Capabilities**

* Traffic severity prediction
* Congestion escalation scoring
* Clearance time estimation
* Road closure recommendations
* Network risk assessment

---

### 🗺️ Map Command View

Interactive geospatial visualization layer built on Leaflet and MapTiler.

**Capabilities**

* Live incident visualization
* Police station overlays
* Deployment radius visualization
* Landmark geocoding
* Bottleneck hotspot identification

---

### 🚔 Incident Deployment Command

Operational response management interface for dispatch controllers.

**Capabilities**

* Automated station recommendations
* Resource allocation workflows
* Dispatch lifecycle simulation
* Capacity-aware responder selection
* Status progression tracking

```text
Alert Sent
    ↓
Acknowledged
    ↓
Units Dispatched
    ↓
Arrived On Scene
```

---

### 📂 Batch Predictions Pipeline

Supports large-scale simulation and stress testing.

**Capabilities**

* Bulk JSON uploads
* Multi-incident evaluation
* Regional congestion simulations
* Rapid scenario testing
* Model benchmarking

---

### 📈 Post-Event Learning Loop

Captures operational outcomes for future optimization.

**Capabilities**

* Predicted vs actual clearance comparison
* Manpower utilization tracking
* Historical telemetry storage
* Performance auditing
* Future model training dataset generation


___
### 🎯 Purpose

The reinforcement loop prepares edge datasets for future optimization cycles by continuously collecting operational feedback and deployment outcomes.

