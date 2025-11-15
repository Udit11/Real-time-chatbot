# real_time_chatbot

Overview
--------
This repository contains a FastAPI backend and a React frontend (Create React App) for a real-time AI chatbot admin and preview widget. The instructions below show how to get both backend and frontend running locally.

Prerequisites
-------------
- Node.js (v16+ / recommended v18+), npm
- Python 3.10+ and pip
- PostgreSQL (or another DB configured via DATABASE_URL)
- Redis (optional, if you enable caching)
- Git
- (Optional) npx http-server or serve for static chat-widget preview

Quick start (summary)
---------------------
1. Prepare backend:
   - copy `.env.example` to `.env` and update DB credentials and API keys
   - create the database and run any migrations (if present)
   - create and activate a Python virtual environment
   - install Python dependencies and start the FastAPI server

2. Prepare frontend:
   - set REACT_APP_API_URL (or use default in `.env.example`)
   - install npm dependencies and start the dev server

3. (Optional) Serve chat-widget static preview:
   - run a simple static server on port 3001 to preview the widget at /chat-widget/index.html

Detailed steps
--------------

1) Clone repository
   git clone <repo-url> d:\real_time_chatbot
   cd d:\real_time_chatbot

2) Backend (FastAPI)
   - Create .env
     cp backend/.env.example backend/.env
     # Edit backend/.env and set DATABASE_URL, REDIS_URL, JWT_SECRET, CHAT_WIDGET_URL, etc.

   - Create DB (example for PostgreSQL)
     # Adjust to match your DATABASE_URL
     createdb chatbot_db

   - Python env & dependencies
     cd backend
     python -m venv .venv
     # PowerShell: .\.venv\Scripts\Activate.ps1
     # cmd: .\.venv\Scripts\activate.bat
     # bash: source .venv/bin/activate
     pip install --upgrade pip
     pip install -r requirements.txt

   - (Optional) Apply migrations
     # If the project uses Alembic or similar:
     alembic upgrade head
     # If no migrations provided, make sure tables exist (create via your ORM or manually)

   - Start backend (development)
     # from repository root
     uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

   - Verify API:
     Open http://localhost:8000/docs

3) Frontend (Create React App)
   - Create .env.local in frontend (or export env var)
     # Example content:
     REACT_APP_API_URL=http://localhost:8000
     # Save as frontend/.env.local

   - Install and run
     cd frontend
     npm install
     npm start
     # App will open at http://localhost:3000 by default

4) Chat-widget (optional, static preview)
   - The widget is at frontend/public/chat-widget/index.html and expects a backend at the configured API_BASE / REACT_APP_API_URL.
   - Serve the folder on port 3001:
     npx http-server ./frontend/public/chat-widget -p 3001
     # or: npx serve ./frontend/public/chat-widget -l 3001
   - Open: http://localhost:3001/index.html
   - To preview a saved avatar, open:
     http://localhost:3001/index.html?avatar_id=<AVATAR_UUID>
     or pass full encoded config:
     http://localhost:3001/index.html?config=<base64-utf8-encoded-json>

Environment variables
---------------------
- backend/.env (use backend/.env.example as a template)
  - DATABASE_URL, REDIS_URL, GOOGLE_GEMINI_API_KEY, ELEVENLABS_API_KEY, JWT_SECRET, CORS_ORIGIN, CHAT_WIDGET_URL, etc.
- frontend/.env.local
  - REACT_APP_API_URL=http://localhost:8000

Notes & troubleshooting
-----------------------
- If uvicorn import path `backend.app.main:app` fails, check where the FastAPI app instance is defined and adapt the uvicorn command accordingly.
- If PostgreSQL connection fails, confirm DATABASE_URL and that the DB exists and is reachable.
- Some functionality (TTS, images) requires API keys — set them in backend/.env.
- Check backend logs (uvicorn console) and browser devtools for frontend errors.
- To reset the frontend build, run `npm run build` (for production) and serve static files.

Useful commands summary
-----------------------
# Backend
cd backend
python -m venv .venv
# activate venv...
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm start

# Chat widget static preview (optional)
npx http-server ./frontend/public/chat-widget -p 3001

