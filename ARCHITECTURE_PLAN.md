# AIMS-UPGRADED Architecture Blueprint

## Current Status vs. Recommended Architecture

### ✅ ALREADY IMPLEMENTED

| Phase | Component | Status | Implementation |
|-------|-----------|--------|----------------|
| **Phase 1** | Database & Security | ✅ | PostgreSQL + Drizzle ORM + RLS (via auth) |
| **Phase 1** | Audit Logging | ✅ | `server/audit.ts` - tracks PHI access |
| **Phase 1** | User/Patient Tables | ✅ | Full schema in `shared/schema.ts` |
| **Phase 2** | Excel Import | ✅ | `client/src/pages/patient-import.tsx` |
| **Phase 2** | Pre-Visit Summary | ⚠️ | Partial - via medical notes history |
| **Phase 3** | Video Telemedicine | ✅ | WebRTC + Twilio (SMS notifications) |
| **Phase 3** | RPM Dashboard | ✅ | `/monitoring` + Bluetooth integration |
| **Phase 3** | Live AI Helper | ⚠️ | Chat via `/assistant` |
| **Phase 4** | Document Parsing | ⚠️ | Lab Interpreter with AI |
| **Phase 4** | Imaging Support | ⚠️ | Gemini Vision API ready |
| **Phase 4** | RAG Architecture | 🔲 | Not implemented |
| **Phase 5** | Semantic Search | 🔲 | Basic search only |
| **Phase 5** | CPT/ICD-10 Lookup | ✅ | Full code manager + Medicare calc |
| **Phase 5** | AI Scribe & SOAP | ✅ | Medical Scribe with GPT-4o |

---

## Architecture Comparison

### Current Stack
```
Frontend:  React + TypeScript + Tailwind + Shadcn
Backend:   Node.js/Express + Drizzle ORM
Database:  PostgreSQL (Neon/Railway)
AI:       OpenAI GPT-4o + Google Gemini
Video:    WebRTC + Twilio
Storage:  Cloudinary
```

### Recommended Low-Code (for faster MVP)
```
Frontend:  FlutterFlow or Bubble
Backend:   Supabase (instead of custom Node)
AI:       Gemini 2.0 (already integrated)
Automation: Make.com for workflows
Search:    Algolia + NLM Clinical API
Video:     Daily.co (simpler than custom WebRTC)
```

---

## Gaps to Fill

### 🔲 HIGH PRIORITY

#### 1. RAG Architecture (Patient-Specific AI)
```typescript
// Missing: Patient-context-aware AI
// Need: Vector embeddings of patient history
// Solution: Pinecone/Chroma for embeddings + context window
```

#### 2. Global Semantic Search
```typescript
// Missing: Search "heart" → finds "tachycardia"
// Solution: Add Algolia or implement semantic search
```

#### 3. Pre-Visit Summary Generator
```typescript
// Need: Auto-generate 3-bullet summary from last visit
// Current: Manual review of notes
```

### ⚠️ MEDIUM PRIORITY

#### 4. Enhanced OCR for Insurance Cards
```typescript
// Current: Manual entry
// Need: Google Vision API for ID/insurance extraction
```

#### 5. Real-time Collaboration
```typescript
// Need: Multiple doctors viewing same chart
// Solution: WebSocket + Yjs for real-time
```

#### 6. Advanced Imaging Analysis
```typescript
// Current: Basic Gemini Vision
// Need: Radiology-specific prompts + findings display
```

---

## Implementation Roadmap

### Step 1: Enhance Search (Week 1)
- [ ] Add fuzzy search to patient list
- [ ] Implement medical synonym mapping
- [ ] Add Algolia integration (optional)

### Step 2: Pre-Visit Summary (Week 2)
- [ ] Create auto-summary endpoint
- [ ] Pull last 3 visits + medications + alerts
- [ ] Display on telemedicine page

### Step 3: RAG Architecture (Week 3)
- [ ] Add vector embedding storage
- [ ] Create patient-context retrieval
- [ ] Connect to GPT-4o/Gemini

### Step 4: Enhanced OCR (Week 4)
- [ ] Add Google Vision API endpoint
- [ ] Create insurance card parser
- [ ] Auto-fill patient intake

---

## API Integrations to Add

### Recommended External Services

| Service | Purpose | Cost | Integration |
|---------|---------|------|-------------|
| **Algolia** | Semantic search | $50/mo | Patient/notes search |
| **Pinecone** | Vector embeddings | $50/mo | RAG architecture |
| **NLM Clinical Tables** | CPT/Dx lookup | Free | Already built-in |
| **Google Vision** | OCR cards | $1.50/1K images | Insurance cards |
| **Daily.co** | Video calls | $0.007/min | Replace custom WebRTC |

---

## Database Schema (Current)

```
users
patients  
appointments
medical_notes
consultation_notes
prescriptions
medical_history_entries
medical_alerts
devices (RPM)
bp_readings
glucose_readings
cpt_codes
icd10_codes
audit_logs ← HIPAA
patient_documents
recording_sessions
```

---

## Quick Wins (Implement Today)

### 1. Pre-Visit Summary
```bash
# Create endpoint that pulls:
# - Last 3 visit notes
# - Current medications
# - Active diagnoses
# - Recent lab results
# - Allergies
```

### 2. Voice Command Enhancement
```bash
# Already implemented:
# - "open medical scribe"
# - "generate soap notes"
# - "check compliance"
```

### 3. Medicare Fee Calculator
```bash
# Already implemented:
# - RVU-based calculation
# - GPCI adjustments
# - 2024 conversion factor
```

---

## Deployment Status

Current deployment on **Vercel** + **Neon**:
- ✅ Automatic deployments from GitHub
- ✅ SSL/HTTPS enabled
- ✅ Environment variables configured
- ⚠️ Need: RLS policies in database
- ⚠️ Need: HIPAA BAA with providers

---

## Next Steps

1. **Deploy and test** current implementation
2. **Add pre-visit summary** automation
3. **Implement RAG** for patient-context AI
4. **Add semantic search** for better findability
5. **Scale** with low-code tools if needed

---

*Last Updated: March 2026*
*Version: 2.0*
