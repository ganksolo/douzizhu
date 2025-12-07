
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/game';

async function main() {
    console.log('--- Testing GitHub Issue #18: Fill All Bots ---');

    // 1. Register User
    const username = `testuser_fill_${Date.now()}`;
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

    // 2. Create PVE Room (4 players)
    console.log('2. Creating PVE Room (4 players)...');
    const roomRes = await axios.post(`${BASE_URL}/rooms`, {
        name: 'Issue #18 Test Room',
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

    let joinedEventCount = 0;
    const joinEvents: any[] = [];

    socket.on('player_joined', (data) => {
        joinedEventCount++;
        joinEvents.push(data);
        console.log(`   📢 player_joined event #${joinedEventCount}:`, data);
    });

    await new Promise<void>((resolve) => {
        socket.on('connect', () => {
            console.log('   ✅ Socket connected.');
            socket.emit('join_room', { roomId });
            resolve();
        });
    });

    await new Promise(r => setTimeout(r, 500));
    console.log('   ✅ Joined room.');

    // 4. Call /fill-bots endpoint
    console.log('4. Calling /fill-bots endpoint...');

    try {
        const fillRes = await axios.post(`${BASE_URL}/rooms/${roomId}/fill-bots`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('   ✅ API Response:', JSON.stringify(fillRes.data, null, 2));

        const { botsAdded, bots } = fillRes.data.data;

        if (botsAdded !== 3) {
            console.error(`   ❌ Expected 3 bots, got ${botsAdded}`);
        } else {
            console.log(`   ✅ Correctly added ${botsAdded} bots`);
        }

        if (!bots || bots.length !== 3) {
            console.error(`   ❌ Bots array mismatch`);
        } else {
            console.log(`   ✅ Bots array contains ${bots.length} bots`);
        }

    } catch (e: any) {
        console.error('   ❌ fill-bots endpoint failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 5. Wait for socket events
    console.log('5. Waiting for socket events...');
    await new Promise(r => setTimeout(r, 2000));

    // Verify events received
    if (joinedEventCount < 3) {
        console.error(`   ❌ Expected at least 3 player_joined events, got ${joinedEventCount}`);
    } else {
        console.log(`   ✅ Received ${joinedEventCount} player_joined events`);
    }

    // Check if bots have isBot flag
    const botEvents = joinEvents.filter(e => e.isBot);
    if (botEvents.length !== 3) {
        console.error(`   ❌ Expected 3 bot events with isBot=true, got ${botEvents.length}`);
    } else {
        console.log(`   ✅ All bot events have isBot flag`);
    }

    console.log('6. Verifying final player list...');
    const roomDetail = await axios.get(`${BASE_URL}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const players = roomDetail.data.data.players;
    console.log(`   Total players in room: ${players.length}`);

    if (players.length !== 4) {
        console.error(`   ❌ Expected 4 players, got ${players.length}`);
    } else {
        console.log(`   ✅ Room has 4 players (1 human + 3 bots)`);
    }

    const botCount = players.filter((p: any) => p.isBot).length;
    console.log(`   Bot count: ${botCount}`);

    if (botCount !== 3) {
        console.error(`   ❌ Expected 3 bots, got ${botCount}`);
    } else {
        console.log(`   ✅ Correct bot count`);
    }

    console.log('--- ✅ GitHub Issue #18 Verification Complete ---');
    socket.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Script Error:', err);
    process.exit(1);
});
