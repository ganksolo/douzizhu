
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/game';

async function main() {
    console.log('--- Starting Phase 33 PVE Bot Verification ---');

    // 1. Register User
    const username = `testuser_pve_${Date.now()}`;
    const password = 'password123';
    console.log(`1. Registering user: ${username}`);

    let token, userId;
    try {
        const regRes = await axios.post(`${BASE_URL}/auth/register`, { username, password });
        token = regRes.data.data.token;
        userId = regRes.data.data.userId;
    } catch (e: any) {
        console.error('   Auth failed:', e.message);
        process.exit(1);
    }

    // 2. Create PVE Room
    console.log('2. Creating PVE Room...');
    const roomRes = await axios.post(`${BASE_URL}/rooms`, {
        name: 'Phase 33 PVE Test',
        type: 'PVE',
        maxPlayers: 4, // Test 4 player
        botCount: 0
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

    const eventPromise = (eventName: string, timeout = 5000) => new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, listener);
            reject(new Error(`Timeout waiting for ${eventName}`));
        }, timeout);

        const listener = (data: any) => {
            clearTimeout(timer);
            resolve(data);
        };
        socket.on(eventName, listener);
    });

    socket.on('connect', () => {
        console.log(`   Socket connected.`);
        socket.emit('join_room', { roomId });
    });

    await eventPromise('player_list_update');
    console.log('   Joined room.');

    // Helper to filter out self-join events if they come late
    const waitForBotJoin = (botNum: number) => new Promise<any>((resolve) => {
        const listener = (data: any) => {
            if (data.userId === userId) return; // Skip self
            console.log(`   ✅ Received player_joined for Bot ${botNum}:`, data);
            socket.off('player_joined', listener);
            resolve(data);
        };
        socket.on('player_joined', listener);
    });

    // 4. Add First Bot & Verify Broadcast
    console.log('4. Adding Bot 1...');
    // We expect a player_joined event for the bot
    const pJoin1 = waitForBotJoin(1);

    await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        const joinData = await pJoin1;
        if (!joinData.isBot) console.error('   ❌ isBot flag missing/false in event');
    } catch (e) {
        console.error('   ❌ Did not receive player_joined for Bot 1');
    }

    // 5. Add Second Bot (Fill Room)
    console.log('5. Adding Bot 2...');
    const pJoin2 = waitForBotJoin(2);

    await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        const joinData2 = await pJoin2;
        if (!joinData2.isBot) console.error('   ❌ isBot flag missing/false in event');
    } catch (e) {
        console.error('   ❌ Did not receive player_joined for Bot 2');
    }

    // 6. Add Third Bot (Fill 4-player Room)
    console.log('6. Adding Bot 3...');
    const pJoin3 = waitForBotJoin(3);

    await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        const joinData3 = await pJoin3;
        console.log('   ✅ Received player_joined for Bot 3:', joinData3);
        if (!joinData3.isBot) console.error('   ❌ isBot flag missing/false in event');
    } catch (e) {
        console.error('   ❌ Did not receive player_joined for Bot 3');
    }

    // 7. Toggle Ready and Expect Game Start
    console.log('7. Toggling Ready...');
    const pStart = eventPromise('game_start', 5000);

    socket.emit('toggle_ready', { roomId, isReady: true });

    try {
        const startData = await pStart;
        console.log('   ✅ Game Start Event Received!', startData);
    } catch (e) {
        console.error('   ❌ Game Start Verification Failed.');
        process.exit(1);
    }

    console.log('--- Verification Complete ---');
    socket.disconnect();
    process.exit(0);
}

main();
