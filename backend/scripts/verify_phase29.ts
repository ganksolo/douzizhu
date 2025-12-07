
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/game';

async function main() {
    console.log('--- Starting Phase 29 Verification ---');

    // 1. Register User
    const username = `testuser_${Date.now()}`;
    const password = 'password123';
    console.log(`1. Restiering user: ${username}`);

    let token, userId;
    try {
        const regRes = await axios.post(`${BASE_URL}/auth/register`, { username, password });
        token = regRes.data.data.token;
        userId = regRes.data.data.userId;
        console.log('   User registered. Token acquired.');
    } catch (e) {
        // Try login
        try {
            const loginRes = await axios.post(`${BASE_URL}/auth/login`, { username, password });
            token = loginRes.data.data.token;
            userId = loginRes.data.data.userId;
            console.log('   User logged in.');
        } catch (e2) {
            console.error('   Auth failed:', e2.message);
            process.exit(1);
        }
    }

    // 2. Create Room
    console.log('2. Creating Room...');
    const roomRes = await axios.post(`${BASE_URL}/rooms`, {
        name: 'Phase 29 Test Room',
        type: 'PVP'
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const roomId = roomRes.data.data.roomId;
    console.log(`   Room created: ${roomId}`);

    // 3. Connect Socket
    console.log('3. Connecting Socket...');
    const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket']
    });

    const receivedEvents: string[] = [];
    const eventPromise = (eventName: string) => new Promise<any>((resolve) => {
        socket.on(eventName, (data) => {
            console.log(`   [Socket] Received '${eventName}':`, JSON.stringify(data).substring(0, 100) + '...');
            receivedEvents.push(eventName);
            resolve(data);
        });
    });

    // Listeners
    const pJoin = eventPromise('player_list_update');

    socket.on('connect', () => {
        console.log(`   Socket connected: ${socket.id}`);
        // 4. Join Room
        console.log('4. Joining Room via Socket...');
        socket.emit('join_room', { roomId });
    });

    // Wait for player list update
    const joinData = await pJoin;
    if (joinData.players.find((p: any) => p.userId === userId)) {
        console.log('   ✅ Join verified: User found in player list.');
    } else {
        console.error('   ❌ Join failed: User not in player list.');
    }

    // 5. Toggle Ready
    console.log('5. Toggling Ready...');
    const pReady = eventPromise('player_list_update'); // Will fire again
    socket.emit('toggle_ready', { roomId, isReady: true });

    const readyData = await pReady;
    const me = readyData.players.find((p: any) => p.userId === userId);
    if (me.ready) {
        console.log('   ✅ Ready verified: User is ready.');
    } else {
        console.error('   ❌ Ready failed: User is not ready.');
    }

    // 6. Add Bots (3 times)
    console.log('6. Adding 3 Bots...');
    const pGameStart = eventPromise('game_start');

    for (let i = 0; i < 3; i++) {
        await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`   Bot ${i + 1} added.`);
        // Give a little time for socket events
        await new Promise(r => setTimeout(r, 500));
    }

    // 7. Verify Game Start
    console.log('7. Waiting for Game Start...');
    try {
        const startData = await Promise.race([
            pGameStart,
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 5000))
        ]);
        console.log('   ✅ Game Start Event Received!', startData);
    } catch (e) {
        console.error('   ❌ Game Start Verification Failed (Timeout or Error).');
    }

    console.log('--- Verification Complete ---');
    socket.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('Script Error:', err);
    process.exit(1);
});
