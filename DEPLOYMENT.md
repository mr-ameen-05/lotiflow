# SOCflow Bare-Metal Deployment Guide

This guide covers the deployment of the SOCflow platform directly on a host machine without container orchestration.

## Prerequisites
1. **Node.js** (v18+)
2. **Python** (v3.9+)
3. **MySQL Server** (5.7)
4. **Redis Server**

## 1. Database Setup
1. Log into your MySQL server.
2. Create the SOCflow database: `CREATE DATABASE socflow;`
3. Execute the schema migration script:
   `mysql -u root -p socflow < database/mysql_schema.sql`

## 2. Infrastructure Setup
Ensure Redis is running on the default port `6379`.

## 3. Backend API (Node.js)
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Configure environment variables (e.g., `DB_HOST`, `DB_USER`, `REDIS_URL`, `SESSION_SECRET`).
4. Start the server: `npm start` (Runs on port 5001)

## 4. Detection Engine (Python)
1. Navigate to the engine directory: `cd server`
2. Install dependencies: `pip install -r requirements.txt`
3. Export required environment variables (matching the backend).
4. Run the daemon: `python analyzer.py`

## 5. Frontend UI (React)
1. Navigate to the root directory.
2. Install dependencies: `npm install`
3. Start the development server (or build for Nginx): `npm run dev`

## 6. Windows Agent Deployment
1. Transfer the `agent/` folder to a Windows endpoint.
2. Install Sysmon and configure it to log Event ID 1 (Process Creation).
3. Install dependencies: `pip install -r requirements.txt`
4. Run the agent: `python agent_core.py`
