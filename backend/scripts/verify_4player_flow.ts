
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001';

async function verify4PlayerFlow() {
    console.log('--- Starting Phase 34 4-Player PVE Verification ---');

    // 1. Register
    const username = `testuser_4p_${Date.now()}`;
    console.log(`1. Registering user: ${username}`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        username,
        password: 'password123'
    });
    const { token, userId } = regRes.data.data;

    // 2. Create Room
    console.log('2. Creating PVE Room...');
    const createRes = await axios.post(
        `${BASE_URL}/rooms`,
        { type: 'PVE', maxPlayers: 4 },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const { roomId } = createRes.data.data;
    console.log(`   Room created: ${roomId}`);

    // 3. Connect Socket
    console.log('3. Connecting Socket...');
    const socket: Socket = io(`${WS_URL}/game`, {
        auth: { token },
        transports: ['websocket']
    });

    await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
            console.log('   Socket connected.');
            resolve();
        });
        socket.on('connect_error', (err) => reject(err));
    });

    // Join Room
    socket.emit('join_room', { roomId });
    await new Promise(r => setTimeout(r, 500));
    console.log('   Joined room.');

    // Listen for player_joined
    let botCount = 0;
    socket.on('player_joined', (data) => {
        if (data.isBot) {
            botCount++;
            console.log(`   ✅ Received player_joined for Bot ${botCount}:`, data);
        }
    });

    // 4. Add 3 Bots
    console.log('4. Adding 3 Bots...');

    // Bot 1
    await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, { headers: { Authorization: `Bearer ${token}` } });
    await new Promise(r => setTimeout(r, 500));

    // Bot 2
    await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, { headers: { Authorization: `Bearer ${token}` } });
    await new Promise(r => setTimeout(r, 500));

    // Bot 3
    await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, { headers: { Authorization: `Bearer ${token}` } });
    await new Promise(r => setTimeout(r, 500));

    if (botCount !== 3) {
        console.warn(`   ⚠️ Warning: Expected 3 bot join events, received ${botCount}`);
    } else {
        console.log('   ✅ All 3 bots joined.');
    }

    // 4.5 Verify Room State (Avatar & isReady)
    console.log('4.5 Verifying Room State (Avatar & isReady)...');
    const roomRes = await axios.get(`${BASE_URL}/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
    const me = roomRes.data.data.players.find((p: any) => p.userId === userId);

    // Verify Avatar
    if (me.avatar === 'default_avatar') {
        throw new Error('❌ Avatar is still "default_avatar". Fix failed.');
    }
    console.log(`   ✅ Avatar verified: ${me.avatar || '(empty string for fallback)'}`);

    // Verify Ready State (Should be false initially)
    if (me.isReady === true) {
        throw new Error('❌ Player should NOT be ready yet.');
    }
    console.log('   ✅ Player isReady is correctly FALSE.');

    // 5. Game Start
    console.log('5. Toggling Ready...');
    const gameStartPromise = new Promise<void>((resolve) => {
        socket.on('game_start', (data) => {
            console.log('   ✅ Game Start Event Received!', data);
            resolve();
        });
    });

    socket.emit('toggle_ready', { roomId, isReady: true }); // Explicitly sending true

    // Verify isReady became true
    await new Promise(r => setTimeout(r, 500));
    const roomRes2 = await axios.get(`${BASE_URL}/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
    const me2 = roomRes2.data.data.players.find((p: any) => p.userId === userId);
    if (me2.isReady !== true) {
        throw new Error(`❌ Player isReady should be TRUE after toggle. Got: ${me2.isReady}`);
    }
    console.log('   ✅ Player isReady verified as TRUE.');

    await gameStartPromise;
    console.log('--- Verification Complete ---');

    socket.disconnect();
    process.exit(0);
}

verify4PlayerFlow().catch(err => {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
});
