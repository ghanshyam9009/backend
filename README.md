# RedBus Clone Backend (Node.js MVC + MongoDB)

## Features
- JWT authentication (register/login)
- Refresh token flow with rotation (`refresh-token`, `logout`, `logout-all`)
- Role-based authorization (`user`, `admin`)
- Helmet security headers middleware
- User flows:
  - Search buses
  - Book seats
  - View booking history
  - Request cancellation
- Admin flows:
  - Manage buses (create, update, view, delete)
  - View users and user details
  - View user booking history
  - View all bookings and booking details
  - Approve/reject cancellation requests

## Tech Stack
- Node.js
- Express
- MongoDB + Mongoose
- JWT
- MVC pattern

## Setup
1. Install dependencies
```bash
npm install
```
2. Create `.env` from `.env.example`
3. Start server
```bash
npm run dev
```

## API Base
- `http://localhost:5000/api`

## Main Endpoints
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all` (requires access token)

### Public Bus APIs
- `GET /api/buses`
- `GET /api/buses/search?source=...&destination=...&date=YYYY-MM-DD&seats=1`
- `GET /api/buses/:id`

### User APIs (Bearer token + role user)
- `POST /api/bookings`
- `GET /api/bookings/my`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id/request-cancellation`

### Admin APIs (Bearer token + role admin)
- `GET /api/admin/buses`
- `POST /api/admin/buses`
- `PUT /api/admin/buses/:id`
- `DELETE /api/admin/buses/:id`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `GET /api/admin/users/:id/bookings`
- `GET /api/admin/bookings`
- `GET /api/admin/bookings/:id`
- `PATCH /api/admin/bookings/:id/cancellation`
