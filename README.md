# 🧠 AssessKit

**AssessKit** is a secure, API-first, headless quiz engine that gives you full control over how quizzes are run, timed, scored, and managed. With just **5 public endpoints**, you can build anything — from competitive exams to classroom assessments — while keeping question content, delivery, and UI fully under your control.

---

## 🚀 Features

- ✅ **5-endpoint protocol** for simplicity and consistency  
- 🔐 **Strict flow control** — no skipping ahead or double submissions  
- ⏱️ **Round-based timing** with precision scoring  
- 📦 **Import/export participants** easily  
- 🔄 **Admin tools** for editing responses and generating leaderboards  
- 🧩 **Bring your own content** — you handle question assets, we handle evaluation  

---

## 📦 Core Concepts

- **Event** → The top-level quiz container  
- **Round** → A timed section within an event  
- **Question** → Referenced by `questionId`, stored and rendered separately (not in AssessKit)  
- **Participant** → Unique per event, identified by login credentials (imported in advance)  

---

## 🔌 Public API Endpoints (5 Only)

| Endpoint                     | Method | Description                                                       |
|-----------------------------|--------|-------------------------------------------------------------------|
| `/participant/login`        | POST   | Authenticates a participant, returns a token                      |
| `/participant/verify`       | POST   | Verifies token/session status                                     |
| `/quiz/start-round`  | POST   | Begins round and starts timer                                     |
| `/quiz/current-question` | GET | Returns current `questionId` and timing info                      |
| `/quiz/submit-answer`| POST   | Submits an answer (empty string `""` = skip)                      |

🔐 **Rules Enforced:**
- Must answer **only the current question**
- **No revisiting** or re-answering
- **One-time submission** per question
- Skipping = submit `""` as the answer

---

## ⚙️ Admin Dashboard Features

- ✅ Create/edit events and rounds  
- ✅ Set question order and scoring schema  
- ✅ Control round start/end timings  
- ✅ Import/export participants via CSV  
- ✅ View and update individual responses  
- ✅ Auto-generate leaderboards  

---

## 🧪 Integration Philosophy

AssessKit doesn’t store or serve your question content. You can load questions however you want — from your own CMS, static file, or database — using the `questionId` provided by the API.

You bring the UI and question data.  
**AssessKit handles flow control, timing, and evaluation.**

---

## 📫 Contact / Support

Need help or want to contribute?

📧 Email: `wpsadi@outloook.com`  
🌐 Website / Docs: [AssessKit Docs](https://documenter.getpostman.com/view/30455760/2sB34co2QR)

---

> _AssessKit — Secure Quizzing. Your Rules._
