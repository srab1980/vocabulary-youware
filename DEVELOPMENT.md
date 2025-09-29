# Development Setup Instructions

## Prerequisites
- Node.js (version 16 or higher)
- npm (comes with Node.js)

## Running the Application Locally

### 1. Start the Backend Server
Open a terminal in the `backend` directory and run:
```bash
npm install
npm run dev
```
The backend will be available at: http://127.0.0.1:8787

### 2. Start the Frontend Development Server
Open another terminal in the root directory and run:
```bash
npm install
npm run dev
```
The frontend will be available at: http://127.0.0.1:5173

### 3. Initialize the Database (if needed)
If you get database errors, run this command in the `backend` directory:
```bash
npx wrangler d1 execute turkish_lexicon --local --file schema.sql
```

## API Endpoints
- Health check: http://127.0.0.1:8787/api/health
- Categories: http://127.0.0.1:8787/api/categories
- Words: http://127.0.0.1:8787/api/words

## Troubleshooting
1. If you see "Cannot reach backend.youware.me", make sure the local backend server is running
2. If you get database errors, make sure you've run the schema.sql file
3. Make sure both terminals are running (backend and frontend)