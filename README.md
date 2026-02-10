![ForReal-logo](truthlens-extension/icons/ForReal-logo-long-blue-cropped.jpg)

**Real-Time, AI-Powered Fact-Checking & Media Verification for X (Twitter) and Text All Across the Web**

ForReal is a powerful browser extension designed to combat misinformation on social media in real-time. By leveraging advanced AI models and trusted search engines, ForReal provides users with instant context, fact-checks, and media verification directly within their X (formerly Twitter) feed.

## 🌟 Inspiration

In an era where misinformation spreads faster than facts, discerning truth from fiction on social media has become increasingly difficult. Deepfakes and AI-generated content further blur the lines of reality. We built ForReal to empower users with immediate, reliable information without leaving their timeline.

## 🚀 What it Does

ForReal integrates seamlessly into the X interface, adding a "Verify" button to posts. When activated, it performs a multi-layered analysis:
1.  **Fact-Checking**: Analyzes the claims in the tweet and cross-references them with reputable sources using **Brave Search API**.
2.  **Verdict Synthesis**: Uses **Google Gemini AI** to synthesize verify claims against the gathered evidence, providing a clear verdict (True, False, Misleading, Unverifiable).
3.  **Media Forensics**: Detects if attached images are AI-generated using the **AI or Not API**.
4.  **Bias Detection**: Analyzes the framing of the content to highlight potential political bias or partisan slant.

## ⚙️ How We Built It

ForReal is built with a modern, modular architecture separating the browser extension from the heavy-lifting AI backend.

### Tech Stack

**Frontend (Browser Extension):**
*   **Manifest V3**: For a secure and performant extension architecture.
*   **JavaScript (ES6+)**: Core logic for DOM manipulation and API communication.
*   **HTML/CSS**: Custom UI injection and popup interface.

**Backend (API):**
*   **Python**: The primary language for our backend logic.
*   **FastAPI**: For a high-performance, asynchronous REST API.
*   **Uvicorn**: ASGI server implementation.

**AI & Services:**
*   **Google Gemini 1.5**: The reasoning engine that acts as our "Senior Fact-Checker".
*   **Brave Search API**: Provides unbiased, real-time access to trusted web sources.
*   **AI or Not API**: Specialized computer vision model for detecting AI-generated imagery.

## 🛠️ Installation & Usage

### Prerequisites
*   Python 3.8+
*   Google Chrome or Brave Browser
*   API Keys for Gemini, Brave Search, and AI or Not (optional for media check)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ForReal.git
cd ForReal/ForReal-backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# GEMINI_API_KEY=...
# BRAVE_API_KEY=...
# AIORNOT_API_KEY=...

# Run the server
python -m app.main
```

The server will start at `http://localhost:8000`.

### 2. Extension Setup

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `ForReal-extension` folder in this repository.
5.  Navigate to X (Twitter) and look for the ForReal icon!

## 🚧 Challenges We Ran Into

*   **DOM Manipulation on X**: X's dynamic class names made it challenging to consistently inject buttons and read content. We had to implement robust selectors and observers.
*   **Prompt Engineering**: Tuning Gemini to provide concise, accurate verdicts without hallucinating required several iterations of prompt refinement.
*   **Rate Limits**: Managing API quotas for search and AI services while ensuring a responsive user experience.

## Unverified Claims
Not every claim can be verified. ForReal is designed to be transparent about its confidence levels and will flag claims as "Unverifiable" if reliable sources cannot be found.

## 🔮 What's Next for ForReal

*   **Video Verification**: expanding media checks to video content.
*   **Cross-Platform Support**: Bringing ForReal to Facebook, Reddit, and LinkedIn.
*   **User Reputation**: Developing a scoring system for frequent misinformation spreaders.
*   **Community Notes Integration**: Cross-referencing with X's own Community Notes for enhanced accuracy.

---

*Built with ❤️ for QHacks 2026*
