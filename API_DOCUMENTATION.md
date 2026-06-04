# Roadside Assistance Platform — API Documentation

> **Version**: 1.0.0  
> **Last Updated**: Day 11 — Search, Filters, Rate Limiting & API Docs  
> **Author**: Development Team

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:5000/api` |
| Production  | `https://your-domain.com/api` |

---

## Authentication

All **protected routes** require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via `/api/auth/login` or `/api/auth/register`.

**Roles**: `user`, `mechanic`, `admin`

---

## Standard Response Format

### Success Response

```json
{
  "success": true,
  "message": "Description of what happened",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Description",
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Rate Limiting

| Route Group | Limit | Window | Error Message |
|-------------|-------|--------|---------------|
| Auth (`/api/auth/*`) | 10 requests | 15 minutes | "Too many login attempts, try again after 15 minutes" |
| Search (`/api/search/*`) | 30 requests | 1 minute | "Too many search requests" |
| General API | 100 requests | 1 minute | "Too many requests" |
| Location Update | 60 requests | 1 minute | "Too many location updates" |

When rate limited, the API returns HTTP `429 Too Many Requests`.

---

## Endpoints

---

### 1. Authentication (`/api/auth`)

#### POST `/api/auth/register`

Register a new user or mechanic.

- **Auth Required**: No
- **Rate Limit**: Auth limiter (10 req / 15 min)

**Request Body**:
```json
{
  "full_name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "user"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `full_name` | string | Yes | User's full name (min 2 chars) |
| `email` | string | Yes | Valid email address (unique) |
| `phone` | string | Yes | 10-digit phone number (unique) |
| `password` | string | Yes | Minimum 6 characters |
| `role` | string | Yes | `user` or `mechanic` |

**Success Response** (201):
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "full_name": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "9876543210",
      "role": "user",
      "is_active": true
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses**:
- `400` — Validation error (missing/invalid fields)
- `409` — Email or phone already registered

---

#### POST `/api/auth/login`

Login with email and password.

- **Auth Required**: No
- **Rate Limit**: Auth limiter (10 req / 15 min)

**Request Body**:
```json
{
  "email": "rahul@example.com",
  "password": "password123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  },
  "timestamp": "..."
}
```

**Error Responses**:
- `400` — Validation error
- `401` — Invalid credentials
- `403` — Account deactivated
- `429` — Rate limit exceeded

---

#### POST `/api/auth/refresh`

Refresh access token using a valid refresh token.

- **Auth Required**: No

**Request Body**:
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_jwt_access_token",
    "user": { ... }
  },
  "timestamp": "..."
}
```

**Error Responses**:
- `401` — Invalid or expired refresh token

---

#### GET `/api/auth/me`

Get current authenticated user's profile.

- **Auth Required**: Yes (any role)

**Success Response** (200):
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "user": {
      "id": "uuid",
      "full_name": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "9876543210",
      "role": "user",
      "is_active": true,
      "profile_picture": null,
      "created_at": "..."
    }
  },
  "timestamp": "..."
}
```

---

#### POST `/api/auth/logout`

Logout and revoke refresh token from Redis.

- **Auth Required**: Yes (any role)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null,
  "timestamp": "..."
}
```

---

### 2. User Profile & Vehicles (`/api/users`)

All routes require authentication.

#### GET `/api/users/profile`

Get current user's profile.

- **Auth Required**: Yes (any role)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "user": { "id", "full_name", "email", "phone", "role", "profile_picture", "is_active", "created_at" }
  },
  "timestamp": "..."
}
```

---

#### PATCH `/api/users/profile`

Update current user's profile.

- **Auth Required**: Yes (any role)

**Request Body**:
```json
{
  "full_name": "Rahul Kumar Sharma",
  "phone": "9876543211"
}
```

**Success Response** (200): Updated user object.

---

#### GET `/api/users/vehicles`

Get all vehicles of the authenticated user.

- **Auth Required**: Yes (any role)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Vehicles fetched successfully",
  "data": {
    "vehicles": [ { "id", "make", "model", "year", "license_plate", "fuel_type", "color" } ],
    "count": 2
  },
  "timestamp": "..."
}
```

---

#### POST `/api/users/vehicles`

Add a new vehicle.

- **Auth Required**: Yes (any role)

**Request Body**:
```json
{
  "make": "Maruti Suzuki",
  "model": "Swift",
  "year": 2022,
  "license_plate": "DL-01-AB-1234",
  "fuel_type": "petrol",
  "color": "White"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `make` | string | Yes | Vehicle manufacturer |
| `model` | string | Yes | Vehicle model |
| `year` | number | Yes | Manufacturing year |
| `license_plate` | string | Yes | Vehicle registration number (unique) |
| `fuel_type` | string | No | petrol, diesel, electric, cng, hybrid |
| `color` | string | No | Vehicle color |

**Success Response** (201): Created vehicle object.

---

#### GET `/api/users/vehicles/:id`

Get a single vehicle by ID (ownership verified).

- **Auth Required**: Yes
- **Error**: `403` if vehicle doesn't belong to user, `404` if not found

---

#### PATCH `/api/users/vehicles/:id`

Update a vehicle (ownership verified).

- **Auth Required**: Yes

---

#### DELETE `/api/users/vehicles/:id`

Delete a vehicle (ownership verified).

- **Auth Required**: Yes

---

### 3. Mechanic Profile & Services (`/api/mechanics`)

All routes require authentication.

#### POST `/api/mechanics/profile`

Create a mechanic profile.

- **Auth Required**: Yes (mechanic only)

**Request Body**:
```json
{
  "business_name": "Ramesh Auto Services",
  "experience_years": 5,
  "specializations": ["towing", "battery", "tyre"],
  "documents": { "license": "DL-12345", "aadhaar": "1234-5678-9012" }
}
```

**Success Response** (201): Created mechanic profile.  
**Error**: `409` if profile already exists.

---

#### GET `/api/mechanics/profile`

Get own mechanic profile with user details.

- **Auth Required**: Yes (mechanic only)

---

#### PATCH `/api/mechanics/profile`

Update mechanic profile.

- **Auth Required**: Yes (mechanic only)

---

#### PATCH `/api/mechanics/location`

Update mechanic's live GPS location (DB + Redis cache).

- **Auth Required**: Yes (mechanic only)
- **Rate Limit**: Location limiter (60 req / min)

**Request Body**:
```json
{
  "current_lat": 28.6139,
  "current_lng": 77.2090
}
```

---

#### PATCH `/api/mechanics/availability`

Toggle availability on/off.

- **Auth Required**: Yes (mechanic only)

**Request Body**:
```json
{
  "is_available": true
}
```

---

#### GET `/api/mechanics/nearby?lat=28.6139&lng=77.2090&radius=10`

Find nearby verified & available mechanics using Haversine formula.

- **Auth Required**: Yes (user only)

| Query Param | Type | Required | Default | Description |
|-------------|------|----------|---------|-------------|
| `lat` | number | Yes | — | User's latitude |
| `lng` | number | Yes | — | User's longitude |
| `radius` | number | No | 10 | Search radius in km |

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "mechanics": [
      { "id", "business_name", "full_name", "rating", "distance_km": 3.45, ... }
    ],
    "count": 5,
    "search": { "lat": 28.6139, "lng": 77.2090, "radius_km": 10 }
  }
}
```

---

#### GET `/api/mechanics/stats`

Get mechanic's own job statistics.

- **Auth Required**: Yes (mechanic only)

---

#### GET `/api/mechanics/:id`

Get any mechanic's public profile (no sensitive documents).

- **Auth Required**: Yes (any role)

---

### 4. Service Requests (`/api/requests`)

All routes require authentication.

#### POST `/api/requests`

Create a new service request.

- **Auth Required**: Yes (user only)

**Request Body**:
```json
{
  "vehicle_id": "uuid",
  "category_id": "uuid",
  "breakdown_lat": 28.6139,
  "breakdown_lng": 77.2090,
  "breakdown_address": "Connaught Place, New Delhi",
  "description": "Car won't start, battery seems dead"
}
```

**Business Rules**:
- User must own the vehicle
- No other active request can exist for this user
- Category must be active
- Estimated price = category base_price

**Success Response** (201): Created request with vehicle + category details.  
**Errors**: `403` (not your vehicle), `404` (vehicle/category not found), `409` (active request exists)

---

#### GET `/api/requests`

Get all requests for the authenticated user/mechanic.

- **Auth Required**: Yes (user, mechanic, admin)
- User sees own requests; mechanic sees assigned requests

---

#### GET `/api/requests/active`

Get the currently active request.

- **Auth Required**: Yes (user or mechanic)

---

#### GET `/api/requests/available`

Get all pending requests available for mechanics to accept.

- **Auth Required**: Yes (mechanic only)

---

#### GET `/api/requests/:id`

Get a single request with full details (role-based access).

- **Auth Required**: Yes (user, mechanic, admin)
- User can only access own requests; mechanic can only access assigned requests; admin has full access

---

#### PATCH `/api/requests/:id/cancel`

Cancel a pending or accepted request.

- **Auth Required**: Yes (user only)

**Request Body**:
```json
{
  "cancel_reason": "Found another service"
}
```

---

#### PATCH `/api/requests/:id/accept`

Mechanic accepts a pending request.

- **Auth Required**: Yes (mechanic only)
- Mechanic must be verified and not have another active request

---

#### PATCH `/api/requests/:id/status`

Mechanic updates request status step-by-step.

- **Auth Required**: Yes (mechanic only)

**Request Body**:
```json
{
  "status": "en_route"
}
```

**Valid Transitions**:
| Current Status | → Allowed Next |
|---------------|----------------|
| `accepted` | `en_route` |
| `en_route` | `arrived` |
| `arrived` | `in_progress` |
| `in_progress` | `completed` |

---

#### PATCH `/api/requests/:id/reject`

Mechanic rejects a pending request (stays pending for others).

- **Auth Required**: Yes (mechanic only)

---

#### GET `/api/requests/:id/timeline`

Get the full status timeline with all timestamps.

- **Auth Required**: Yes (user, mechanic, admin)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "current_status": "completed",
    "timeline": {
      "created_at": "...",
      "requested_at": "...",
      "accepted_at": "...",
      "en_route_at": "...",
      "arrived_at": "...",
      "started_at": "...",
      "completed_at": "...",
      "cancelled_at": null
    }
  }
}
```

---

### 5. Service Categories (`/api/services`)

#### GET `/api/services`

Get all active service categories.

- **Auth Required**: No (public)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "categories": [
      { "id", "name": "Towing", "slug": "towing", "icon": "🚗", "base_price": 500, "description": "..." }
    ],
    "count": 6
  }
}
```

---

#### GET `/api/services/:id`

Get a single service category by ID.

- **Auth Required**: No (public)

---

### 6. Admin Panel (`/api/admin`)

All admin routes require authentication + admin role.

#### GET `/api/admin/dashboard`

Get comprehensive dashboard statistics.

- **Auth Required**: Yes (admin only)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_users": 150,
      "total_mechanics": 30,
      "total_requests": 500,
      "pending_requests": 12,
      "completed_requests": 400,
      "revenue": 250000,
      ...
    }
  }
}
```

---

#### GET `/api/admin/users?role=user&is_active=true&search=rahul&page=1&limit=10`

Get all users with filters and pagination.

- **Auth Required**: Yes (admin only)

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `role` | string | No | Filter by role (user/mechanic/admin) |
| `is_active` | boolean | No | Filter by active status |
| `search` | string | No | Search in name, email, phone |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |

---

#### GET `/api/admin/users/:id`

Get full details of a single user.

- **Auth Required**: Yes (admin only)

---

#### PATCH `/api/admin/users/:id/status`

Activate or deactivate a user account.

- **Auth Required**: Yes (admin only)

**Request Body**:
```json
{
  "is_active": false,
  "reason": "Policy violation"
}
```

---

#### GET `/api/admin/mechanics/pending`

Get all mechanics pending verification.

- **Auth Required**: Yes (admin only)

---

#### PATCH `/api/admin/mechanics/:id/verify`

Verify or reject a mechanic.

- **Auth Required**: Yes (admin only)

**Request Body**:
```json
{
  "is_verified": true
}
```

Or reject:
```json
{
  "is_verified": false,
  "rejection_reason": "Incomplete documents"
}
```

---

#### GET `/api/admin/requests?status=pending&category_id=uuid&page=1&limit=10`

Get all service requests with filters and pagination.

- **Auth Required**: Yes (admin only)

---

#### GET `/api/admin/requests/:id`

Get full details of any request (unrestricted).

- **Auth Required**: Yes (admin only)

---

#### GET `/api/admin/categories`

Get all categories including inactive ones.

- **Auth Required**: Yes (admin only)

---

#### POST `/api/admin/categories`

Create a new service category.

- **Auth Required**: Yes (admin only)

**Request Body**:
```json
{
  "name": "Engine Repair",
  "slug": "engine-repair",
  "icon": "🔧",
  "base_price": 1500,
  "description": "Complete engine diagnosis and repair"
}
```

---

#### PATCH `/api/admin/categories/:id`

Update a service category.

- **Auth Required**: Yes (admin only)

---

#### GET `/api/admin/reports/requests?startDate=2024-01-01&endDate=2024-12-31`

Get requests report for a date range.

- **Auth Required**: Yes (admin only)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "report": {
      "status_breakdown": { "pending": 12, "completed": 400, ... },
      "category_breakdown": [ ... ],
      "top_mechanics": [ ... ]
    },
    "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" }
  }
}
```

---

#### GET `/api/admin/reports/mechanics`

Get mechanic performance report.

- **Auth Required**: Yes (admin only)

---

### 7. Reviews & Ratings (`/api/reviews`)

#### GET `/api/reviews/mechanic/:mechanicId`

Get all reviews for a specific mechanic (with summary + pagination).

- **Auth Required**: No (public)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "reviews": [ { "id", "rating", "comment", "reviewer_name", "created_at" } ],
    "summary": {
      "avg_rating": 4.5,
      "total_reviews": 25,
      "breakdown": { "1": 0, "2": 1, "3": 3, "4": 8, "5": 13 }
    }
  },
  "pagination": { ... }
}
```

---

#### POST `/api/reviews`

Submit a review for a completed request.

- **Auth Required**: Yes (user only)

**Request Body**:
```json
{
  "request_id": "uuid",
  "rating": 5,
  "comment": "Excellent service! Very quick response."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | uuid | Yes | Completed service request ID |
| `rating` | number | Yes | 1-5 star rating |
| `comment` | string | No | Review comment |

**Business Rules**:
- Request must be `completed`
- Request must belong to the user
- Only one review per request
- Mechanic's average rating is recalculated automatically

**Errors**: `400` (not completed), `403` (not your request), `409` (already reviewed)

---

#### GET `/api/reviews/my`

Get all reviews submitted by the authenticated user.

- **Auth Required**: Yes (user only)

---

#### GET `/api/reviews/can-review/:requestId`

Check if the user can review a specific request.

- **Auth Required**: Yes (user only)

---

#### PATCH `/api/reviews/:id`

Update own review (rating and/or comment).

- **Auth Required**: Yes (user only)

---

#### DELETE `/api/reviews/:id`

Delete own review.

- **Auth Required**: Yes (user only)

---

### 8. Service History (`/api/history`)

All routes require authentication (user or mechanic).

#### GET `/api/history?page=1&limit=10`

Get service history (completed/cancelled requests).

- **Auth Required**: Yes (user or mechanic)
- Users see their own history; mechanics see their job history

---

#### GET `/api/history/summary`

Get summary statistics.

- **Auth Required**: Yes (user or mechanic)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "total_requests": 15,
    "completed": 12,
    "cancelled": 3,
    "total_spent": 18500
  }
}
```

---

### 9. Notifications (`/api/notifications`)

All routes require authentication.

#### GET `/api/notifications?page=1&limit=10`

Get all notifications with pagination and unread count.

- **Auth Required**: Yes (any role)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "notifications": [
      { "id", "title", "message", "type", "is_read": false, "created_at" }
    ],
    "unread_count": 5
  },
  "pagination": { ... }
}
```

---

#### GET `/api/notifications/unread-count`

Get count of unread notifications.

- **Auth Required**: Yes (any role)

---

#### PATCH `/api/notifications/mark-read`

Mark specific notifications as read.

- **Auth Required**: Yes (any role)

**Request Body**:
```json
{
  "notification_ids": ["uuid1", "uuid2"]
}
```

---

#### PATCH `/api/notifications/mark-all-read`

Mark all notifications as read.

- **Auth Required**: Yes (any role)

---

#### DELETE `/api/notifications/:id`

Delete a single notification.

- **Auth Required**: Yes (any role)

---

#### DELETE `/api/notifications/read`

Delete all read notifications.

- **Auth Required**: Yes (any role)

---

### 10. Search & Filters (`/api/search`) — ⭐ NEW (Day 11)

All search routes require authentication.  
**Rate Limit**: 30 requests per minute.

#### GET `/api/search/mechanics`

Search verified mechanics with advanced filters.

- **Auth Required**: Yes (any role)

| Query Param | Type | Required | Default | Description |
|-------------|------|----------|---------|-------------|
| `keyword` | string | No | — | Search in business_name (ILIKE) |
| `specialization` | string | No | — | Filter by service type (e.g., "towing") |
| `min_rating` | number | No | — | Minimum rating filter |
| `max_rating` | number | No | — | Maximum rating filter |
| `is_available` | boolean | No | — | Filter by availability |
| `lat` | number | No | — | User's latitude (for distance calc) |
| `lng` | number | No | — | User's longitude (for distance calc) |
| `radius` | number | No | 10 | Search radius in km (requires lat/lng) |
| `sort_by` | string | No | rating | `rating`, `distance`, `total_jobs` |
| `sort_order` | string | No | DESC | `ASC` or `DESC` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page (max 100) |

**Example Requests**:
```
GET /api/search/mechanics?keyword=Ramesh
GET /api/search/mechanics?specialization=towing&min_rating=4
GET /api/search/mechanics?lat=28.6139&lng=77.2090&radius=10&sort_by=distance&sort_order=ASC
GET /api/search/mechanics?is_available=true&page=1&limit=5
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Mechanics search results fetched successfully",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "business_name": "Ramesh Auto Services",
      "experience_years": 5,
      "specializations": ["towing", "battery", "tyre"],
      "is_verified": true,
      "is_available": true,
      "rating": 4.50,
      "total_jobs": 120,
      "full_name": "Ramesh Kumar",
      "phone": "9876543210",
      "distance_km": 3.45
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET `/api/search/requests`

Search service requests with role-based access.

- **Auth Required**: Yes (user, mechanic, admin)
- **Access Control**: Users see only own requests; mechanics see only assigned; admin sees all

| Query Param | Type | Required | Default | Description |
|-------------|------|----------|---------|-------------|
| `status` | string | No | — | Single or comma-separated: `pending,completed` |
| `category_id` | uuid | No | — | Filter by service category |
| `startDate` | date | No | — | Filter: created_at >= value |
| `endDate` | date | No | — | Filter: created_at <= value |
| `keyword` | string | No | — | Search in breakdown_address or description |
| `sort_by` | string | No | created_at | `created_at` or `status` |
| `sort_order` | string | No | DESC | `ASC` or `DESC` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page |

**Example Requests**:
```
GET /api/search/requests?status=completed
GET /api/search/requests?startDate=2024-01-01&endDate=2024-12-31
GET /api/search/requests?keyword=Delhi&sort_by=created_at&sort_order=DESC
GET /api/search/requests?status=pending,accepted&page=1&limit=5
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Requests search results fetched successfully",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "status": "completed",
      "breakdown_address": "Connaught Place, New Delhi",
      "vehicle_make": "Maruti Suzuki",
      "vehicle_model": "Swift",
      "category_name": "Towing",
      "user_name": "Rahul Sharma",
      "mechanic_name": "Ramesh Kumar",
      "created_at": "..."
    }
  ],
  "pagination": { ... },
  "timestamp": "..."
}
```

---

#### GET `/api/search/users`

Search all users — **admin only**.

- **Auth Required**: Yes (admin only)

| Query Param | Type | Required | Default | Description |
|-------------|------|----------|---------|-------------|
| `keyword` | string | No | — | Search in name, email, or phone |
| `role` | string | No | — | Filter by role: `user`, `mechanic`, `admin` |
| `is_active` | boolean | No | — | Filter by active status |
| `startDate` | date | No | — | Registration date >= value |
| `endDate` | date | No | — | Registration date <= value |
| `sort_by` | string | No | created_at | `created_at` or `full_name` |
| `sort_order` | string | No | DESC | `ASC` or `DESC` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page |

**Example Requests**:
```
GET /api/search/users?keyword=Rahul&role=user
GET /api/search/users?is_active=true&sort_by=full_name&sort_order=ASC
GET /api/search/users?startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Users search results fetched successfully",
  "data": [
    {
      "id": "uuid",
      "full_name": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "9876543210",
      "role": "user",
      "is_active": true,
      "created_at": "..."
    }
  ],
  "pagination": { ... },
  "timestamp": "..."
}
```

**Error Response** (403 — Non-admin):
```json
{
  "success": false,
  "message": "Access denied. Required role(s): admin. Your role: user."
}
```

---

### 11. Health Check

#### GET `/api/health`

Check API and service health status.

- **Auth Required**: No

**Success Response** (200):
```json
{
  "success": true,
  "message": "🚗 Roadside Assist API is running!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development",
  "services": {
    "server": "running",
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## Error Codes Reference

| Status Code | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Created successfully |
| `400` | Bad request / Validation error |
| `401` | Unauthorized (no/invalid token) |
| `403` | Forbidden (insufficient role/permissions) |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |
| `503` | Service unavailable |

---

## Database Schema Overview

| Table | Description |
|-------|-------------|
| `users` | All users (user, mechanic, admin roles) |
| `vehicles` | User's registered vehicles |
| `mechanic_profiles` | Mechanic-specific data (specializations, rating, location) |
| `service_categories` | Available service types (towing, battery, etc.) |
| `service_requests` | Core service request records with full lifecycle |
| `reviews` | User reviews for completed requests |
| `notifications` | In-app notification records |

---

## Changelog

| Day | Features |
|-----|----------|
| Day 3 | Auth system (register, login, JWT, refresh tokens, role middleware) |
| Day 4 | User profile + vehicle management APIs |
| Day 5 | Mechanic profile + location + availability APIs |
| Day 6 | Service request creation, listing, cancellation |
| Day 7 | Request accept, status updates, reject, timeline |
| Day 8 | Admin panel (dashboard, user management, mechanic verification, categories, reports) |
| Day 9 | Reviews, ratings, service history |
| Day 10 | Notifications system |
| Day 11 | Search & filters, query builder, rate limiting, API response standardization, API documentation |

---

## Socket.io Events Documentation

### Connection
URL: ws://localhost:5000
Auth: { token: 'JWT_TOKEN' }

### Client → Server Events
| Event | Data | Description |
|-------|------|-------------|
| mechanic:location:update | { lat, lng, requestId? } | Update live location |
| mechanic:go:offline | none | Go offline |
| user:watch:mechanic | { requestId, mechanicId } | Start watching mechanic |
| user:unwatch:mechanic | { requestId } | Stop watching |
| request:subscribe | { requestId } | Subscribe to request updates |
| request:unsubscribe | { requestId } | Unsubscribe |
| notification:get:unread | none | Get unread count |
| notification:mark:read | { notificationIds[] } | Mark as read |
| client:reconnected | { lastEventTime, activeRequestId? } | Handle reconnect |

### Server → Client Events
| Event | Data | Description |
|-------|------|-------------|
| mechanic:location:receive | { lat, lng, updatedAt } | Live location update |
| mechanic:location:ack | { success, skipped? } | Location update ack |
| request:current:status | { requestId, status, timeline } | Current status |
| request:status:updated | { requestId, newStatus, previousStatus } | Status change |
| request:new | { requestId, serviceType, location, distance } | New request nearby |
| request:accepted | { requestId, mechanic } | Request accepted |
| request:cancelled | { requestId, reason } | Request cancelled |
| mechanic:en_route | { requestId } | Mechanic en route |
| mechanic:arrived | { requestId } | Mechanic arrived |
| service:completed | { requestId, finalPrice } | Service done |
| notification:new | { id, title, message, type } | New notification |
| notification:unread_count | { count } | Unread count |
| notification:recent | { notifications[] } | Recent unread |
| notification:missed | { notifications[], count } | Missed on reconnect |
| admin:stats:update | { stats object } | Live dashboard stats |
| admin:request:new | { requestId } | New request for admin |
| server:error | { message } | Server error |
