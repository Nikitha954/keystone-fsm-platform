# KEYSTONE – Field Service Management Platform

Enterprise-grade FSM platform built with Java 21 + Spring Boot 3 + React + TypeScript.

---

## Architecture

```
keystone/
├── keystone-backend/     Java 21 · Spring Boot 3 · PostgreSQL · JWT
├── keystone-frontend/    React 18 · TypeScript · Tailwind CSS · Redux
├── docker-compose.yml    Full stack in one command
└── .github/workflows/    CI/CD pipeline
```

---

## Quick Start (Docker – Recommended)

### Prerequisites
- Docker Desktop installed and running
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-org/keystone.git
cd keystone

# 2. Launch the full stack
docker compose up --build

# 3. Access the application
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:8080
#    Swagger:   http://localhost:8080/swagger-ui.html
```

---

## Local Development Setup

### Backend

**Prerequisites:** Java 21, Maven 3.9+, PostgreSQL 16

```bash
# 1. Create the PostgreSQL database
psql -U postgres
CREATE DATABASE keystone_db;
CREATE USER keystone_user WITH PASSWORD 'keystone_pass';
GRANT ALL PRIVILEGES ON DATABASE keystone_db TO keystone_user;
\q

# 2. Navigate to backend
cd keystone-backend

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Run the application
# Flyway will auto-run migrations and seed data on startup
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Backend starts on http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Frontend

**Prerequisites:** Node.js 20+

```bash
# 1. Navigate to frontend
cd keystone-frontend

# 2. Copy environment file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev

# Frontend starts on http://localhost:3000
```

---

## Demo Accounts

All demo accounts use password: **Admin@123**

| Role        | Email                       | Access                              |
|-------------|-----------------------------|-------------------------------------|
| Manager     | admin@keystone.com          | Full system access                  |
| Dispatcher  | dispatcher@keystone.com     | Create/assign work orders           |
| Technician  | tech@keystone.com           | View and execute assigned jobs      |
| Customer    | customer@keystone.com       | Submit and track requests           |

---

## API Reference

Base URL: `http://localhost:8080/api/v1`

All endpoints (except `/auth/login`) require: `Authorization: Bearer <token>`

### Authentication
| Method | Endpoint        | Description       |
|--------|-----------------|-------------------|
| POST   | /auth/login     | Login, get tokens |
| POST   | /auth/refresh   | Refresh token     |

### Work Orders
| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | /workorders                     | List/search (Manager, Dispatcher) |
| POST   | /workorders                     | Create work order            |
| GET    | /workorders/{id}                | Get full details + history   |
| POST   | /workorders/{id}/assign         | Assign technician            |
| POST   | /workorders/{id}/status         | Transition status            |
| DELETE | /workorders/{id}                | Delete (Manager only)        |
| GET    | /workorders/my                  | Technician's own jobs        |

### Status Transition Rules (HTTP 409 if violated)
```
NEW → ASSIGNED | CANCELLED
ASSIGNED → IN_PROGRESS | CANCELLED
IN_PROGRESS → ON_HOLD | COMPLETED
ON_HOLD → IN_PROGRESS | CANCELLED
COMPLETED → CLOSED
CLOSED → (terminal)
CANCELLED → (terminal)
```

### Customers & Sites
| Method | Endpoint                     | Description       |
|--------|------------------------------|-------------------|
| GET    | /customers                   | List customers    |
| POST   | /customers                   | Create customer   |
| PUT    | /customers/{id}              | Update customer   |
| DELETE | /customers/{id}              | Soft delete       |
| GET    | /sites/customer/{id}/all     | Sites by customer |
| POST   | /sites                       | Create site       |

### Parts & Inventory
| Method | Endpoint                              | Description         |
|--------|---------------------------------------|---------------------|
| GET    | /parts                                | List parts          |
| POST   | /parts                                | Create part         |
| GET    | /parts/low-stock                      | Low stock alert     |
| POST   | /parts/workorder/{woId}/usage         | Log usage (deducts) |
| PATCH  | /parts/{id}/stock?quantity=N          | Adjust stock        |

### Dashboard
| Method | Endpoint             | Description             |
|--------|----------------------|-------------------------|
| GET    | /dashboard/manager   | Admin/Dispatcher stats  |
| GET    | /dashboard/technician| Technician personal stats|

---

## Database Schema

### Key Design Decisions

1. **Enums stored as VARCHAR** — readable in SQL queries and easy to add values
2. **DB CHECK constraints** — second line of defense after application validation
3. **Soft deletes** — `is_active = false` instead of DELETE, preserving history
4. **Composite indexes** — `(assigned_to, status)` for technician dashboard queries
5. **Partial index** — notifications unread index only covers `WHERE is_read = FALSE`
6. **JSONB for audit** — flexible schema for capturing before/after state changes
7. **TIMESTAMPTZ** — all timestamps stored in UTC with timezone info

---

## Security

- Passwords hashed with BCrypt (cost factor 12)
- JWT access tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Role-based method security with `@PreAuthorize`
- CSRF disabled (stateless REST API)
- CORS configured for frontend origin
- SQL injection prevention via JPA parameterized queries
- All secrets via environment variables (never hardcoded)

---

## Running Tests

```bash
# Backend unit tests
cd keystone-backend
./mvnw test

# Run specific test class
./mvnw test -Dtest=WorkOrderServiceTest

# Run with coverage report
./mvnw test jacoco:report
# Report: target/site/jacoco/index.html
```

---

## Production Deployment

### Environment Variables Required

**Backend:**
```
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=jdbc:postgresql://<host>:5432/keystone_db
DB_USERNAME=<username>
DB_PASSWORD=<password>
JWT_SECRET=<256-bit-base64-encoded-secret>
```

Generate a production JWT secret:
```bash
openssl rand -base64 32
```

**Frontend:**
```
VITE_API_URL=https://your-api-domain.com/api/v1
```

### Deploy to Railway (Backend)

1. Push code to GitHub
2. Create new Railway project → Deploy from GitHub
3. Add PostgreSQL service
4. Set environment variables
5. Railway auto-detects Maven and deploys

### Deploy to Vercel (Frontend)

1. Connect GitHub repo to Vercel
2. Set root directory to `keystone-frontend`
3. Add environment variable: `VITE_API_URL`
4. Deploy

---

## Tech Stack Summary

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Language     | Java 21, TypeScript                     |
| Backend      | Spring Boot 3, Spring Security, JPA     |
| Auth         | JWT (JJWT 0.12), BCrypt                 |
| Database     | PostgreSQL 16, Flyway migrations        |
| Frontend     | React 18, Vite, Tailwind CSS            |
| State        | Redux Toolkit                           |
| HTTP Client  | Axios with interceptors                 |
| Charts       | Recharts                                |
| Forms        | React Hook Form                         |
| API Docs     | SpringDoc OpenAPI 3 (Swagger UI)        |
| Containers   | Docker, Docker Compose                  |
| CI/CD        | GitHub Actions                          |

---

## Folder Structure

```
keystone-backend/src/main/java/com/keystone/
├── config/           Security, OpenAPI, CORS config
├── domain/
│   ├── entity/       JPA entities (User, WorkOrder, etc.)
│   └── enums/        WorkOrderStatus (with state machine), Priority, Roles
├── repository/       Spring Data JPA repositories
├── service/          Business logic (WorkOrderService, etc.)
├── controller/       REST controllers
├── dto/
│   ├── request/      Input validation DTOs
│   └── response/     Output DTOs
├── security/         JWT provider, filter, UserDetails
└── exception/        Global handler + custom exceptions

keystone-frontend/src/
├── components/
│   ├── layout/       Sidebar, TopNavbar, AppLayout
│   └── common/       StatusBadge, PriorityBadge
├── pages/
│   ├── auth/         LoginPage
│   ├── manager/      Dashboard, WorkOrders, Customers, Parts, Users
│   ├── technician/   TechnicianDashboard, TechnicianWorkOrders
│   └── customer/     CustomerPortal
├── services/         API calls (workOrderService, customerService, etc.)
├── store/            Redux store + authSlice
├── hooks/            useAuth hook
└── types/            All TypeScript interfaces
```
