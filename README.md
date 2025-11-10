# real_time_chatbot

## Overview

A comprehensive real-time chatbot system with customizable avatars, conversation management, and an administrative dashboard. Built with a FastAPI backend, React/TypeScript admin UI, and a lightweight embeddable chat widget. The system supports WebSockets for sub-second, bidirectional communication, avatar customization, NLP integrations, and analytics.

---

## Repository layout

```
real_time_chatbot/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── config/
│   │   ├── utils/
│   │   └── __init__.py
│   ├── requirements.txt
│   ├── main.py
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   ├── package.json
│   └── public/
├── chat-widget/
│   ├── src/
│   │   ├── services/
│   │   └── styles/
│   └── dist/
└── README.md
```

---

## Quick start (development)

> **Note:** Running the system locally requires **two terminals** (or two shells). One terminal runs the backend server, the other runs the frontend/admin interface. This allows the backend WebSocket endpoint and frontend React app to run concurrently.

### 1. Prerequisites

* Python 3.10+
* Node.js 18+ and npm/yarn
* PostgreSQL (or Docker)
* Redis (or Docker)
* Git

### 2. Environment setup

Copy and fill the environment template for the backend:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env to set DATABASE_URL, REDIS_URL, API keys, JWT_SECRET, etc.
```

### 3. Database and Redis (optional with Docker)

If you don’t have PostgreSQL and Redis installed locally, you can use Docker:

```bash
# from repo root
docker run --name rtc-postgres -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=chatbot_db -p 5432:5432 -d postgres:15
docker run --name rtc-redis -p 6379:6379 -d redis:7
```

### 4. Install backend dependencies and start server

```bash
# Terminal 1: backend
cd backend
python -m venv .venv
source .venv/bin/activate   # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

This will start the FastAPI server on `http://localhost:8000`.

### 5. Install frontend dependencies and start admin UI

```bash
# Terminal 2: frontend
cd frontend
npm install
npm start
```

This will start the React admin interface on `http://localhost:3000`.


### 6. Two-terminal requirement

* **Terminal 1:** Run backend (FastAPI) — serves APIs and WebSocket endpoints.
* **Terminal 2:** Run frontend (React admin) — for avatar management and analytics.

You can also use process managers (like `concurrently` or `pm2`) to run both in one shell if needed.

---

## Features

* Real-time WebSocket chat with presence and typing indicators
* Avatar system (visuals, voice, personality traits)
* Conversation management with context retention and sentiment analysis
* Admin dashboard for avatar design, training data management, analytics, and A/B testing
* Scalable architecture with Redis and PostgreSQL

---

## Testing

### Backend tests

```bash
cd backend
pytest -q
```

### Frontend tests

```bash
cd frontend
npm test
```

---

## Deployment notes

* Use HTTPS/WSS in production.
* Deploy behind a reverse proxy (e.g., NGINX).
* Use managed PostgreSQL and Redis.
* Serve frontend build via CDN.

---

## Contributing

Follow standard Git flow. Open issues for bugs/features and create pull requests against `main`.

---

## License

MIT License
