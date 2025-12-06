
import { AuthService } from '../backend/src/auth/auth.service';
import { UserService } from '../backend/src/user/user.service';
import { User, AuthType } from '../backend/src/user/user.entity';
import { JwtService } from '@nestjs/jwt';

// Mock User Entity
const mockUser = (username: string, passwordHash: string): User => ({
    id: 'u-1',
    nickname: username,
    auth_type: AuthType.PASSWORD,
    passwordHash: passwordHash,
    avatar: 'avatar',
    lastLogin: new Date(),
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
});

// Mock UserService
const users = new Map<string, User>();
const mockUserService = {
    createUser: async (username: string, passwordHash: string) => {
        console.log(`[Mock] Creating user ${username} with hash ${passwordHash}`);
        const user = mockUser(username, passwordHash);
        users.set(username, user);
        return user;
    },
    findByUsername: async (username: string) => {
        const user = users.get(username);
        console.log(`[Mock] Found user ${username}:`, user ? 'YES' : 'NO');
        if (user) console.log(`[Mock] Stored hash: ${user.passwordHash}`);
        return user;
    }
} as unknown as UserService;

// Mock JwtService
const mockJwtService = {
    sign: (payload: any) => 'mock-token'
} as unknown as JwtService;

async function debugAuth() {
    console.log('--- Debugging AuthService ---');
    const authService = new AuthService(mockUserService, mockJwtService);

    const username = 'debugUser';
    const password = 'password123';

    // 1. Register
    console.log('\n1. Testing Register...');
    const regResult = await authService.register(username, password);
    console.log('Register Result:', regResult.success ? 'Success' : 'Fail');

    // 2. Login
    console.log('\n2. Testing Login...');
    try {
        const loginResult = await authService.login(username, password);
        if (loginResult && loginResult.success) {
            console.log('✅ Login Logic PASSED');
        } else {
            console.error('❌ Login Logic FAILED (Result null or valid)');
        }
    } catch (e) {
        console.error('❌ Login Logic Threw Error:', e);
    }
}

debugAuth();
