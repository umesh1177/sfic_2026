# 🏛️ My Clean Navsari (મારું સ્વચ્છ નવસારી)
## Citizen-Led Digital Cleanliness Monitoring & Community Action Platform
### Smart India Hackathon Problem Statement: PS000089
**Navsari Municipal Corporation (NMC), Gujarat, India**

---

## 🌟 Executive Overview
**My Clean Navsari** is a production-grade, mobile-first Civic-Tech platform designed specifically for the citizens and sanitation administration of Navsari Municipal Corporation. Built to address the challenges outlined in SIH PS000089, this solution transforms passive public complaints into an AI-verified, geo-fenced community action network.

---

## 🎨 Design System & Visual Reference
Inspired by the clean civic health interface at `https://wad-project-2026-1.onrender.com/landing.html`, the platform adheres to an ultra-clean, modern civic design system:
- **Primary Brand Teal**: `#095c54` & `#05443e`
- **Gradients**: `linear-gradient(135deg, #095c54 0%, #0d6e65 50%, #10b981 100%)`
- **Soft Accents**: `#e6f4f1` (Teal Soft), `#fef3c7` (Amber Soft), `#fee2e2` (Red Soft), `#ecfdf5` (Emerald Soft)
- **Surfaces & Background**: `#f8faf9` with pure `#ffffff` cards and subtle border `#e2e8f0`
- **Typography**: Google Font **Plus Jakarta Sans** (weights 400 to 800)
- **Glassmorphic Navigation**: Blur `14px`, sticky top bar with pulsing live status indicators
- **Mobile-First Layout**: 5-tab docked bottom navigation for smartphones (Home, Report, Complaints, Map, More)

---

## 🏗️ Architecture & Technology Stack

```
SFIC_2026/
├── frontend/          # React 19 + TypeScript + Vite + Tailwind CSS + Leaflet + i18n
├── backend/           # Node.js + Express + TypeScript + Zod + JWT + PostGIS Simulator
├── ml-service/        # Python + PyTorch + Torchvision + FastAPI Microservice
├── database/          # PostgreSQL + PostGIS DDL schema.sql & seed.sql
└── README.md          # Comprehensive Architecture & Deployment Guide
```

### 1. Frontend
- **Framework**: React 19 with TypeScript & Vite
- **Styling**: Tailwind CSS tailored with reference tokens & CSS variables
- **Icons**: Lucide React
- **Geographical Maps**: Leaflet & OpenStreetMap restricted to Navsari jurisdiction
- **Multilingual Support**: English, Gujarati (`ગુજરાતી`), and Hindi (`हिन्दी`)
- **PWA & Offline**: Installable manifest, offline drafts queue, and automatic network sync
- **Gamification**: Canvas-Confetti celebration triggers on submission and badge unlocks

### 2. Backend
- **Server**: Node.js & Express.js with TypeScript
- **Validation**: Zod schema validation
- **Authentication**: Phone-number-only accounts (`+91`), SMS OTP session handling, bcrypt hashing, and JWT tokens
- **Security**: Rate limiting via `express-rate-limit`, human verification challenge CAPTCHA, RBAC, sanitized public map endpoints
- **Geospatial (PostGIS)**: Point-in-polygon ray-casting algorithm validating coordinates within Navsari’s 13 administrative wards

### 3. Database
- **Engine**: PostgreSQL with PostGIS extensions
- **DDL Schema**: `database/schema.sql` (Tables: `profiles`, `citizen_auth_profiles`, `otp_verification_sessions`, `wards`, `complaint_locations`, `complaints`, `complaint_activity_logs`, `cleanliness_drives`, `challenges`, `reward_definitions`, `support_tickets`)
- **Seed Data**: `database/seed.sql` (13 official wards, sample complaints, upcoming drives, active challenges, and badges)

### 4. AI & ML Service
- **Framework**: Python 3, PyTorch, Torchvision, FastAPI
- **Model Architecture**: Deep CNN transfer learning based on ResNet50
- **Categories**: Littering, Open Garbage Dumping, Overflowing Dustbin, Roadside Garbage, Drainage/Waste Accumulation, Other Cleanliness Issues
- **Content Moderation**: Multilingual profanity and hate speech blocker in English, Gujarati, and Hindi
- **Photo Quality Assistant**: Blur detection, lighting check, and resolution validation

---

## 📱 Navigation & Features

### 1. Home Dashboard
- Welcome banner with live date and citizen credentials
- Dynamic database counts: Total Submitted, Pending Review, In Progress, Resolved
- Quick action shortcuts (Report, Track, Map, Drives)
- Recent public issues in Navsari
- Ward Cleanliness Leaderboard (Wards 1 to 13)
- Community Impact summary (Drives joined, Badges unlocked, Civic Karma points)

### 2. Report an Issue (Guided 8-Step Flow)
1. **Photo & Category**: Camera/file upload with preset sample triggers
2. **AI Classification**: PyTorch ResNet50 model prediction with confidence score and manual override
3. **Content Moderation**: Automatic safety gate blocking inappropriate non-civic content
4. **Voice-to-Text**: Speech recording in Gujarati, Hindi, or English
5. **Location & Ward**: PostGIS boundary check strictly enforcing Navsari municipal boundaries
6. **Duplicate Check**: Detection of overlapping reports within 120 meters
7. **Photo Quality Assistance**: Real-time lighting and framing guidance
8. **Final Confirmation**: Instant generation of official Tracking ID (e.g. `NMC-2026-10021`) + Confetti

### 3. My Complaints
- Tab filters: *All, Submitted, Under Review, Assigned, In Progress, Awaiting Verification, Resolved, Reopened*
- Timeline Stepper: Visual progress tracking from assignment to sanitation worker proof
- Activity Audit Log: Complete municipal history with officer notes
- Reopen Unresolved Issue: Option for citizens to reopen incomplete cleanup with reason
- Feedback & Star Rating: 1 to 5 star rating with written review

### 4. Navsari Cleanliness Map
- Leaflet map restricted to Navsari coordinates `[20.9467, 72.9520]`
- Polygons for all 13 official wards with cleanliness index colors
- Chronic waste hotspots (`Junathana Market`, `Station Road`, `Dudhiya Talao`)
- Privacy-shielded public markers (protects citizen phone numbers and private notes)

### 5. Cleanliness Drives
- Upcoming municipal drives (Dudhiya Talao Lakefront, Lunsikui Ground, Historic Dandi Beach)
- Live volunteer progress bars, deadline countdowns, RSVP button, duplicate registration check

### 6. Community Challenges
- Ward missions: *Navsari Zero-Litter Week*, *Dudhiya Talao Plastic-Free Drive*, *Green Neighborhood Streak*
- Target vs. current progress bars and citizen participation counter

### 7. Rewards & Recognition
- Badges: *Cleanliness Champion*, *Active Community Member*, *Clean-up Volunteer*, *Responsible Reporter*
- Points system and verified monthly champions leaderboard

### 8. Feedback & Support
- Open civic helpdesk tickets
- Interactive two-way message thread between citizen and Ward Desk Officers

### 9. My Profile & Accessibility
- Name, phone (OTP protected), email, address, and locality management
- Text-to-Speech (Read aloud helper)
- Font scaling
- High contrast dark mode toggle
- Secure logout

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 1. Start the Express Backend
```bash
cd backend
npm install
npm run dev
```
*Backend runs on: `http://localhost:5000` (Healthcheck: `http://localhost:5000/api/health`)*

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

### 3. (Optional) Run the Python ML Microservice
```bash
cd ml-service
pip install -r requirements.txt
python main.py
```
*ML microservice runs on: `http://localhost:8000`*

---

## 🔒 Security Architecture
- Phone numbers stored in E.164 normalized format (`+91XXXXXXXXXX`)
- Passwords hashed using `bcrypt` (10 rounds)
- OTPs hashed and checked on the server (5-minute expiration, max 5 attempts)
- Human verification challenge CAPTCHA verified on the backend
- Cross-Site Request Forgery & XSS protection with strict CORS
- Zero leakage of citizen phone numbers or emails on the public map

---

## 👥 Authors
Developed for Smart India Hackathon **Problem Statement PS000089**  
**Navsari Municipal Corporation (NMC), Gujarat**
