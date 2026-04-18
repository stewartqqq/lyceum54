# Lyceum Life Web Frontend

This is now a plain React + Vite web app for running in a desktop browser.

## Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Backend URL

The frontend reads the API URL from:

```env
VITE_API_URL=http://127.0.0.1:5000/api
```

## Demo Login

```text
mira@school.test
Password123
```

If the Flask backend is not running, the web app falls back to local demo data so the interface still opens.
