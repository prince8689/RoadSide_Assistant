# Roadside Vehicle Assistance & Mechanic Booking Platform

## Overview
Real-time on-demand roadside assistance platform connecting vehicle owners with nearby verified mechanics.

## Features
- Real-time mechanic tracking (Socket.io)
- 3 role dashboards (User/Mechanic/Admin)
- 60 REST APIs
- Live notifications
- Mobile responsive + PWA

## Tech Stack
- Frontend: React.js + Tailwind CSS + Framer Motion
- Backend: Node.js + Express.js
- Database: PostgreSQL + Redis
- Real-time: Socket.io
- Auth: JWT

## Quick Start
### Prerequisites
- Node.js v18+
- PostgreSQL v14+
- Redis v7+

### Backend Setup
```bash
cd server
cp .env.example .env
# Fill in your values
npm install
psql -U postgres -f src/config/schema.sql
npm run dev
```

### Frontend Setup
```bash
cd client
cp .env.example .env
npm install
npm start
```

## Test Accounts
**Admin:** admin@roadside.com / Admin@123
**User:** rahul@test.com / Test@1234
**Mechanic:** ramesh@test.com / Test@1234

## API Documentation
See API_DOCUMENTATION.md

## Deployment
See DEPLOYMENT_GUIDE.md (created Day 28)
