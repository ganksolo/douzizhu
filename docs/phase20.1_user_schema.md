# Phase 20.1: User Schema Verification

## 📋 Table Structure

### Table: `user`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `nickname` | VARCHAR(50) | NOT NULL | Display name |
| `avatar` | VARCHAR(255) | NOT NULL, DEFAULT '...' | Avatar URL |
| `auth_type` | ENUM | 'guest', 'password' | Authentication method |
| `password_hash` | VARCHAR(255) | NULLABLE | Hashed password (if auth_type='password') |
| `last_login` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last active time |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update time |

---

## 🔍 SQL Schema

Use the following SQL to verify the table structure or manually create it if synchronization is disabled.

```sql
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nickname` varchar(50) NOT NULL,
  `avatar` varchar(255) NOT NULL DEFAULT 'https://via.placeholder.com/150',
  `auth_type` enum('guest', 'password') NOT NULL DEFAULT 'guest',
  `password_hash` varchar(255) DEFAULT NULL,
  `last_login` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🧪 Verification Tests

### Test 1: Create Guest User
```typescript
// Service Call
const user = await userService.createGuest();
console.log(user);
```
**Expected**:
- `id`: Generated (e.g., "1")
- `nickname`: "Guest-XXXX"
- `auth_type`: "guest"
- `password_hash`: null

### Test 2: Update Profile
```typescript
await userService.updateProfile(user.id, { nickname: "NewName" });
```
**Expected**:
- `nickname` updated to "NewName"
- `updated_at` timestamp updated

---

## ⚠️ Notes
- `password_hash` is explicitly excluded from default SELECT queries in `UserEntity` for security (`select: false`).
- `id` is defined as `string` in TypeScript (TypeORM bigint handling) but stored as `BIGINT` in MySQL.
