# Phase 20.2: Authentication API Guide

## 🔐 Authentication Endpoints

### 1. Guest Login
**Endpoint**: `POST /auth/guest-login`
**Description**: Creates a new guest account (or logs in existing if implemented) and returns a JWT.

**Request**:
```http
POST /auth/guest-login
Content-Type: application/json

{}
```

**Response (201 Created)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "nickname": "Guest-1234",
    "avatar": "https://api.dicebear.com/...",
    "auth_type": "guest"
  }
}
```

### 2. Get Current Profile (Protected)
**Endpoint**: `GET /auth/me`
**Description**: Returns the profile of the currently logged-in user. Requires JWT.

**Request**:
```http
GET /auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK)**:
```json
{
  "userId": "1",
  "username": "Guest-1234"
}
```

---

## 🧪 Postman Setup

1. **Environment Variable**: Create a variable `jwt_token` in your Postman environment.
2. **Login Request**:
   - In the `Tests` tab of the Login request, add:
     ```javascript
     var jsonData = pm.response.json();
     pm.environment.set("jwt_token", jsonData.access_token);
     ```
3. **Protected Requests**:
   - In the `Authorization` tab, select **Bearer Token**.
   - Set the Token field to `{{jwt_token}}`.

---

## ⚠️ Notes
- Default JWT Secret: `dev_secret_key` (Change in `.env` for production).
- Token Expiry: 7 days.
