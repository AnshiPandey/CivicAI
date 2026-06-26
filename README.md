# CivicAI 🚀

> AI-Powered Municipal Incident Intelligence & Smart Civic Grievance Platform

CivicAI is an AI-driven civic issue reporting and municipal incident management platform that helps citizens report public infrastructure problems while enabling government authorities to prioritize, analyze, and manage incidents through intelligent triage and real-time dashboards.

Instead of simply collecting complaints, CivicAI uses Google's Gemini AI to analyze uploaded images, estimate severity, classify incidents, recommend dispatch actions, assess public safety risks, and assist municipal authorities in making faster decisions.

---

## 🌍 Live Demo

https://civicai-92627368025.us-west1.run.app

---

# ✨ Features

## 👤 Citizen Portal

- Report civic issues with title and description
- Upload images or capture live evidence
- Automatic GPS detection
- Interactive Google Maps location pinning
- Address/Landmark support
- AI-powered complaint analysis
- Complaint history dashboard
- Search, filter and sort reports
- SLA progress tracking
- View complete AI diagnostics

---

## 🤖 Gemini AI Analysis

After submission, Gemini AI automatically performs:

- Image understanding
- Incident classification
- Severity scoring (1–5)
- Confidence estimation
- Fake/Anomaly detection
- Department routing
- Estimated repair timeline
- Safety recommendations
- Dispatch recommendations
- AI reasoning & explanation

---

## 🗺 Interactive GIS Dashboard

- Live complaint map
- Google Maps integration
- Heatmap visualization
- Cluster mode
- Pin mode
- Severity filters
- Department filters
- Nearby incident discovery

---

## 🏛 Municipal Authority Panel

Designed for government departments.

Includes:

- Total cases
- Pending cases
- Critical hazards
- Resolved reports
- Department analytics
- Incident lifecycle statistics
- Risk Index
- Priority Management
- Complaint Ledger
- Dispatch Management
- Case Triage

---

## 📊 AI Telemetry

Each complaint contains:

- Severity Score
- AI Confidence
- Estimated Repair Time
- Fake Risk
- Department Classification
- Recommended Dispatch Actions
- Citizen Safety Precautions
- AI Explanation
- Location Intelligence

---

## 🌙 UI Features

- Modern responsive interface
- Dark Mode / Light Mode
- Mobile-friendly layout
- Interactive cards
- Clean dashboard visualization

---

# 🛠 Tech Stack

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

Artificial Intelligence

- Google Gemini API

Maps & Location

- Google Maps JavaScript API
- Geolocation API

Deployment

- Google Cloud Run

---

# 📂 Project Structure

```
app/
components/
lib/
hooks/
public/
types/
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/AnshiPandey/CivicAI.git

cd CivicAI
```

## Install Dependencies

```bash
npm install
```

## Configure Environment Variables

Create a `.env.local` file.

```env
GEMINI_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

## Run Development Server

```bash
npm run dev
```

Visit

```
http://localhost:3000
```

---


# Future Enhancements

- User Authentication
- Notification System
- Mobile Application
- Department Login
- Real-time Status Updates
- Multilingual Support
- Predictive Analytics
- Complaint Verification using Vision Models

---

# Author

**Anshi Pandey**

---

Made with ❤️ using Google Gemini AI, Google Maps Platform, Next.js and React.
