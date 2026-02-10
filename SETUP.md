# TruthLens Setup & Run Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ installed
- Chrome browser
- API Keys configured (see Backend Setup)

---

## Quick Commands To Run

```powershell
# Activate venv (in truthlens-backend dir)
.\venv\Scripts\Activate.ps1

# Install dependencies (in truthlens-backend dir)
pip install -r requirements.txt

# Run backend (in truthlens-backend dir)
python -m uvicorn app.main:app --reload --port 8000

# Deactivate venv
deactivate
```

### 4. Configure Environment Variables
Edit the `.env` file with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
BRAVE_SEARCH_API_KEY=your_brave_search_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_herex  # Optional for TTS
HIVE_API_KEY=your_hive_key_here  # Optional for AI detection
```

### 5. Run the Backend Server
```powershell
# Make sure you're in truthlens-backend directory with (venv) active
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Backend is now running at**: `http://localhost:8000`

---

## 🔌 Chrome Extension Setup

### 1. Open Chrome Extensions Page
Navigate to: `chrome://extensions/`

### 2. Enable Developer Mode
Toggle "Developer mode" in the top-right corner

### 3. Load the Extension
1. Click "Load unpacked"
2. Navigate to: `QHacks-2026/truthlens-extension`
3. Select the folder

### 4. Verify Installation
- Extension icon should appear in Chrome toolbar
- Extension should be listed with name "ForReal"

---

## ✨ Everything is Ready When...

✅ **Backend**: 
- Virtual environment activated (`(venv)` in prompt)
- Dependencies installed (no import errors)
- Server running on port 8000
- Can access `http://localhost:8000/docs`

---

