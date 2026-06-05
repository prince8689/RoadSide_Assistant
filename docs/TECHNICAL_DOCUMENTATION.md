# Technical Documentation

## System Architecture

### Overview
Three-tier web application:
- Client tier: React.js (3 dashboards)
- API tier: Node.js + Express.js (60 REST APIs)
- Data tier: PostgreSQL + Redis

### Real-Time Layer
Socket.io WebSocket server for:
- Live mechanic location tracking
- Instant notifications
- Real-time status updates
- Admin live dashboard

## Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React.js | 18.x |
| Styling | Tailwind CSS | 3.x |
| Animations | Framer Motion | 10.x |
| State | Zustand | 4.x |
| HTTP Client | Axios | 1.x |
| Maps | React Leaflet | 4.x |
| Backend | Node.js | 18.x |
| Framework | Express.js | 4.x |
| Database | PostgreSQL | 15.x |
| Cache | Redis | 7.x |
| Real-time | Socket.io | 4.x |
| Auth | JWT + bcryptjs | - |
| Validation | Joi | 17.x |

## Database Schema
7 tables with relationships:
users → vehicles (1:many)
users → mechanic_profiles (1:1)
users → service_requests (1:many as user)
users → service_requests (1:many as mechanic)
service_requests → service_categories (many:1)
service_requests → vehicles (many:1)
service_requests → reviews (1:1)
users → notifications (1:many)

## API Structure
60 endpoints across 9 modules:
- /api/auth (5 endpoints)
- /api/users (7 endpoints)
- /api/mechanics (8 endpoints)
- /api/requests (10 endpoints)
- /api/admin (13 endpoints)
- /api/reviews (6 endpoints)
- /api/history (2 endpoints)
- /api/notifications (6 endpoints)
- /api/search (3 endpoints)

## Socket Events
35+ socket events for real-time features
See API_DOCUMENTATION.md for full list

## Security Measures
- JWT authentication (7d access / 30d refresh)
- bcryptjs password hashing (salt: 12)
- Joi input validation on all endpoints
- Parameterized SQL queries (no injection)
- Helmet.js security headers
- CORS restricted to frontend domain
- Rate limiting per route
- XSS prevention middleware
- Request body size limit (10kb)

## Deployment
- Frontend: Vercel (global CDN)
- Backend: Railway (Node.js server)
- Database: Railway PostgreSQL
- Cache: Railway Redis
- SSL: Auto-managed by platforms

## Performance
- Redis caching for live locations
- PostgreSQL indexes on all FK columns
- React lazy loading for code splitting
- Debounced search inputs
- Socket.io location debouncing
- Framer Motion optimized animations
