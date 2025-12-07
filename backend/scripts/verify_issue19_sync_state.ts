
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/game';

async function main() {
    console.log('--- Testing GitHub Issue #19: sync_state Fields ---');

    // 1. Register User
    const username = `testuser_issue19_${Date.now()}`;
    const password = 'password123';
    console.log(`1. Registering user: ${username}`);

    let token, userId;
    try {
        const regRes = await axios.post(`${BASE_URL}/auth/register`, { username, password });
        token = regRes.data.data.token;
        userId = regRes.data.data.userId;
        console.log('   ✅ User registered.');
    } catch (e: any) {
        console.error('   ❌ Auth failed:', e.message);
        process.exit(1);
    }

    // 2. Create PVE Room
    console.log('2. Creating PVE Room...');
    const roomRes = await axios.post(`${BASE_URL}/rooms`, {
        name: 'Issue #19 Test Room',
        type: 'PVE',
        maxPlayers: 4
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const roomId = roomRes.data.data.roomId;
    console.log(`   ✅ Room created: ${roomId}`);

    // 3. Connect Socket
    console.log('3. Connecting Socket...');
    const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket']
    });

    let syncStateReceived = false;
    let hasCurrentTurn = false;
    let hasPhase = false;
    let capturedState: any = null;

    socket.on('sync_state', (data) => {
        syncStateReceived = true;
        capturedState = data;

        console.log('   📢 sync_state received:');
        console.log(`      - currentState: ${data.currentState}`);
        console.log(`      - currentTurn: ${data.currentTurn}`);
        console.log(`      - phase: ${data.phase}`);
        console.log(`      - timestamp: ${data.timestamp}`);

        if (data.currentTurn !== undefined) hasCurrentTurn = true;
        if (data.phase !== undefined) hasPhase = true;
    });

    await new Promise<void>((resolve) => {
        socket.on('connect', () => {
            console.log('   ✅ Socket connected.');
            socket.emit('join_room', { roomId });
            resolve();
        });
    });

    // Wait for initial sync_state
    await new Promise(r => setTimeout(r, 1000));

    if (!syncStateReceived) {
        console.error('   ❌ No sync_state received after join');
        process.exit(1);
    }

    // 4. Fill bots to trigger game start
    console.log('4. Filling bots and starting game...');
    await axios.post(`${BASE_URL}/rooms/${roomId}/fill-bots`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // Wait for ready
    await new Promise(r => setTimeout(r, 500));
    socket.emit('toggle_ready', { roomId, isReady: true });

    // Wait for game to start and new sync_state
    await new Promise(r => setTimeout(r, 2000));

    // 5. Verify fields
    console.log('5. Verifying sync_state fields...');

    if (!hasCurrentTurn) {
        console.error('   ❌ currentTurn field is MISSING');
        process.exit(1);
    } else {
        console.log('   ✅ currentTurn field is PRESENT');
    }

    if (!hasPhase) {
        console.error('   ❌ phase field is MISSING');
        process.exit(1);
    } else {
        console.log('   ✅ phase field is PRESENT');
    }

    if (capturedState) {
        console.log('\\n6. Sample sync_state payload:');
        console.log(JSON.stringify({
            currentState: capturedState.currentState,
            currentTurn: capturedState.currentTurn,
            phase: capturedState.phase,
            players: capturedState.players?.length || 0,
            timestamp: capturedState.timestamp
        }, null, 2));
    }

    console.log('\\n--- ✅ GitHub Issue #19 Verification Complete ---');
    socket.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Script Error:', err);
    process.exit(1);
});
