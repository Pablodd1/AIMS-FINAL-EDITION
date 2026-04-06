# AIMS Medical - Frontend Overhaul Plan
## Complete EHR System with AI Medical Scribe

---

## 🎯 OVERVIEW

Transform AIMS into a world-class EHR with intuitive UI, AI-powered medical scribe, drag-drop calendar, comprehensive patient charts, and voice-controlled interface.

---

## 📋 FEATURES TO IMPLEMENT

### 1. INTAKE FORMS WITH VOICE ✅ (Exists - Needs UI Polish)
**Current:** `patient-intake-voice.tsx`
**Improvements:**
- Better visual design with progress indicator
- Split-screen: Questions on left, voice visualization on right
- Live auto-save with visual feedback
- Consent checkbox with digital signature
- Summary view before submission
- Direct integration to patient chart workflow

### 2. VISUAL CALENDAR - DRAG & DROP ✅ (Exists - Needs Enhancement)
**Current:** `appointments.tsx`
**Improvements:**
- Full-screen calendar view (like Google Calendar)
- Color-coded appointments by status/type
- Drag-to-reschedule with time preview
- Week/Day/Month views
- Quick appointment creation from calendar
- Patient photo thumbnails on appointments

### 3. PATIENT CHART - COMPREHENSIVE VIEW
**New Component:** `patient-chart.tsx`
**Features:**
- Left sidebar: Patient demographics, photo, quick stats
- Main area: Tabbed interface (Overview, Visits, Labs, Documents, Billing)
- Timeline view of all patient interactions
- Quick actions: New note, Schedule, Message, Call
- Document viewer with OCR search
- Lab results with trend graphs

### 4. AI MEDICAL SCRIBE - ENHANCED ✅ (Exists - Major Upgrade)
**Current:** `medical-scribe.tsx`
**New Features:**
- Split view: Recording panel + Live note generation
- Real-time SOAP note preview while recording
- One-click CPT/ICD-10 extraction with verification
- AI chat sidebar for medical questions
- Voice commands ("Add vital signs", "Generate summary")
- Templates: SOAP, H&P, Progress Note, Procedure, Discharge
- Signature capture with stylus/mouse
- Direct save to patient chart

### 5. CPT/ICD-10 CODE DATABASE
**New Service:** `medical-codes-service.ts`
**Features:**
- Embedded 2026 CPT codes (10,000+ codes)
- Embedded 2026 ICD-10-CM codes (70,000+ codes)
- RAG-based semantic search
- Auto-suggestion from note content
- Add/Edit/Delete custom codes
- Recent codes quick access
- Code validation and cross-referencing

### 6. LAB INTEGRATION & ANALYSIS
**New Component:** `lab-analyzer.tsx`
**Features:**
- Upload PDF/image of lab results
- OCR extraction of lab values
- Auto-compare to reference ranges
- Visual indicators (High/Low/Normal)
- AI recommendations for lifestyle/supplements/medications
- Trend tracking over time
- PDF report generation

### 7. TELEMEDICINE - INTEGRATED
**Existing:** `telemedicine.tsx`, `join-consultation.tsx`
**Enhancements:**
- Built-in medical scribe during video call
- Recording with consent
- Real-time transcription
- Auto-generate note after call
- Screen sharing for lab review
- Waiting room with branding

### 8. VOICE COMMANDS SYSTEM
**New Component:** `voice-command-provider.tsx`
**Features:**
- Global voice activation ("Hey AIMS")
- Command palette: "Open patient John Doe", "Schedule appointment", "Generate note"
- Hands-free navigation
- Medical terminology recognition
- Custom command shortcuts

---

## 🎨 DESIGN SYSTEM

### Color Palette (Healthcare Professional)
```
Primary:    #0F5C97 (Medical Blue)
Secondary:  #10B981 (Success Green)
Accent:     #F59E0B (Warning Amber)
Danger:     #EF4444 (Alert Red)
Neutral:    #64748B (Slate)
Background: #F8FAFC (Light Gray)
Card:       #FFFFFF (White)
Text:       #1E293B (Dark Slate)
```

### Typography
```
Headings:   Inter, sans-serif (600-700 weight)
Body:       Inter, sans-serif (400-500 weight)
Monospace:  JetBrains Mono (for codes/data)
```

### Layout Principles
- **Left Navigation:** Collapsible sidebar with icons + labels
- **Top Bar:** Global search, notifications, user profile, voice command button
- **Main Content:** Card-based layout with consistent spacing
- **Right Panel:** Contextual actions and patient summary (when in patient view)

---

## 🏗️ ARCHITECTURE

### Component Hierarchy
```
App
├── Layout
│   ├── SidebarNavigation
│   ├── TopBar (with VoiceCommandButton)
│   └── MainContent
├── Pages
│   ├── Dashboard
│   ├── PatientChart (NEW - Comprehensive)
│   ├── Appointments (ENHANCED - Calendar)
│   ├── MedicalScribe (ENHANCED - AI)
│   ├── IntakeForms (POLISHED - Voice)
│   ├── Telemedicine (INTEGRATED)
│   ├── LabAnalyzer (NEW)
│   └── CodeManager (NEW)
├── Components
│   ├── PatientSummaryPanel (NEW)
│   ├── VoiceRecorder (ENHANCED)
│   ├── SOAPNoteViewer (NEW)
│   ├── CodeExtractor (NEW)
│   ├── LabResultCard (NEW)
│   └── AIChatPanel (NEW)
└── Services
    ├── MedicalCodesDB (NEW)
    ├── VoiceRecognition (NEW)
    ├── LabOCR (NEW)
    └── AIScribe (ENHANCED)
```

### State Management
- React Query for server state
- Zustand for global UI state (sidebar, voice commands, current patient)
- Local state for component-specific data

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile:     < 640px   (Stacked layout, bottom nav)
Tablet:     640-1024px (Collapsible sidebar)
Desktop:    > 1024px   (Full sidebar, 3-panel layout)
```

---

## 🔧 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
1. Set up design system (colors, typography, spacing)
2. Create Layout component with navigation
3. Implement patient context provider
4. Build PatientSummaryPanel component

### Phase 2: Patient Chart (Week 1-2)
1. Create comprehensive patient chart page
2. Timeline view component
3. Document manager with search
4. Lab results viewer with graphs

### Phase 3: Medical Scribe Enhancement (Week 2)
1. Redesign UI with split view
2. Real-time note preview
3. AI chat integration
4. Voice commands for scribe

### Phase 4: Calendar Enhancement (Week 2-3)
1. Full-calendar view implementation
2. Drag-and-drop rescheduling
3. Color coding and filtering
4. Quick appointment creation

### Phase 5: Medical Codes & Labs (Week 3)
1. CPT/ICD-10 database integration
2. Code extraction UI
3. Lab upload and OCR
4. Analysis and recommendations

### Phase 6: Polish & Integration (Week 4)
1. Voice command system
2. Telemedicine integration
3. Intake form improvements
4. End-to-end testing

---

## 🧪 SMOKE TEST CHECKLIST

### Intake Forms
- [ ] Voice recording works in all major browsers
- [ ] Questions display while recording
- [ ] Consent checkbox must be checked
- [ ] Auto-extraction populates all 15 fields
- [ ] Progress bar updates in real-time
- [ ] Save to patient chart creates new patient
- [ ] Summary email sent to doctor

### Calendar
- [ ] Drag appointment to new date works
- [ ] Color coding matches status
- [ ] Week/Day/Month views switch correctly
- [ ] Click empty slot creates appointment
- [ ] Patient photos display on appointments
- [ ] Email patient list works

### Patient Chart
- [ ] All patient data loads < 2 seconds
- [ ] Timeline shows all visits chronologically
- [ ] Document viewer opens PDFs
- [ ] Lab graphs display trends
- [ ] Quick actions work (New note, Schedule)

### Medical Scribe
- [ ] Recording starts/stops correctly
- [ ] Live transcript appears while speaking
- [ ] SOAP note generates in < 10 seconds
- [ ] CPT codes extract accurately
- [ ] ICD-10 codes extract accurately
- [ ] AI chat responds to medical questions
- [ ] Signature captures and saves
- [ ] Note saves to correct patient chart

### Lab Analysis
- [ ] PDF upload extracts values
- [ ] OCR reads common lab formats
- [ ] Reference ranges highlight abnormalities
- [ ] AI recommendations generate
- [ ] Trend graphs display over time

### Voice Commands
- [ ] "Hey AIMS" activates voice mode
- [ ] "Open patient [name]" navigates to chart
- [ ] "Schedule appointment" opens scheduler
- [ ] "Generate note" starts scribe
- [ ] Commands work throughout app

---

## 📦 DELIVERABLES

1. **Complete Frontend Source Code**
   - All React components with TypeScript
   - Custom hooks for voice, AI, codes
   - Service layer for database operations

2. **Documentation**
   - Component usage guide
   - Voice command reference
   - Database schema for codes

3. **Testing Suite**
   - Unit tests for critical components
   - E2E tests for main workflows
   - Voice recognition accuracy tests

4. **Deployment Package**
   - Production build configuration
   - Environment variables template
   - Railway deployment guide

---

## 🚀 NEXT STEPS

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1: Foundation
4. Weekly progress reviews
5. Deploy to staging for testing
6. Production deployment

---

**Estimated Timeline:** 4 weeks (aggressive) / 6 weeks (comfortable)
**Priority:** Patient Chart → Medical Scribe → Calendar → Labs → Voice Commands
