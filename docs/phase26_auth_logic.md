# Phase 26: User Authentication Logic

## 1. Goal
Switch from mock password hashing to secure `bcryptjs` hashing and refine the `AuthService` to support registration and login with proper security practices.

## 2. Key Features

### 2.1 Secure Hashing
- **Library**: `bcryptjs`
- **Salt Rounds**: 10
- **Flow**:
  - **Register**: Hash password before storing in DB.
  - **Login**: Compare input password with stored hash.

### 2.2 Refined Auth Service
- **`register`**: 
  - Validates username uniqueness.
  - Hashes password.
  - Creates user with `auth_type: 'password'`.
  - Returns JWT token.
- **`login`**:
  - Finds user by username.
  - Validates password hash.
  - Returns JWT token.

## 3. API Contract

### 3.1 Endpoints
- **`POST /auth/register`**
  - Body: `{ username, password }`
  - Returns: `{ success: true, data: { token, userId, ... } }`
- **`POST /auth/login`**
  - Body: `{ username, password }`
  - Returns: `{ success: true, data: { token, userId, ... } }`

### 3.2 Data Model
- **User Entity**:
  - `password_hash`: String (Nullable, for guests)
  - `auth_type`: `guest` | `password`

## 4. Verification
### Unit/Manual Test
1. **Register User**:
   - `POST /auth/register` with valid data -> 201 Created.
   - Verify DB has hashed password (not plain text).
2. **Login Success**:
   - `POST /auth/login` with correct password -> 200 OK + Token.
3. **Login Failure**:
   - `POST /auth/login` with wrong password -> 401 Unauthorized.
