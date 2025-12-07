
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/game';

async function main() {
    console.log('--- Starting Phase 32 Game Loop Verification ---');

    // 1. Register User
    const username = `testuser_${Date.now()}`;
    const password = 'password123';
    console.log(`1. Registering user: ${username}`);

    let token, userId;
    try {
        const regRes = await axios.post(`${BASE_URL}/auth/register`, { username, password });
        token = regRes.data.data.token;
        userId = regRes.data.data.userId;
        console.log('   User registered. Token acquired.');
    } catch (e: any) {
        console.error('   Auth failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 2. Create Room
    console.log('2. Creating Room...');
    const roomRes = await axios.post(`${BASE_URL}/rooms`, {
        name: 'Phase 32 Loop Test',
        type: 'PVP',
        maxPlayers: 4
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

    // Helper for events
    const eventPromise = (eventName: string, timeout = 5000) => new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, listener);
            reject(new Error(`Timeout waiting for ${eventName}`));
        }, timeout);

        const listener = (data: any) => {
            clearTimeout(timer);
            // socket.off(eventName, listener); // Don't auto-remove for sync_state
            resolve(data);
        };
        socket.on(eventName, listener);
    });

    socket.on('connect', () => {
        console.log(`   Socket connected: ${socket.id}`);
        socket.emit('join_room', { roomId });
    });

    socket.on('action_error', (err) => {
        console.error('   ❌ Action Error:', err);
    });

    // 4. Join & Add Bots
    await eventPromise('player_list_update');
    console.log('   Joined room.');

    console.log('4. Adding 3 Bots...');
    for (let i = 0; i < 3; i++) {
        await axios.post(`${BASE_URL}/rooms/${roomId}/ai`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        await new Promise(r => setTimeout(r, 200));
    }
    console.log('   Bots added.');

    // 5. Toggle Ready -> Start Game
    console.log('5. Toggling Ready...');
    socket.emit('toggle_ready', { roomId, isReady: true });

    console.log('6. Waiting for Game Start...');
    await eventPromise('game_start', 10000);
    console.log('   ✅ Game Started!');

    // 7. Loop until my turn and Play
    console.log('7. Waiting for my turn...');

    let hasPlayed = false;
    let turnCount = 0;

    // Listen for sync_state manually
    socket.on('sync_state', (state) => {
        if (hasPlayed) return;

        console.log(`   [Sync] Phase: ${state.currentState}, Turn: ${state.currentTurn} (Me: ${userId})`);

        if (state.currentTurn === userId) {
            console.log('   👉 IT IS MY TURN!');

            // Find my hand
            const myData = state.players.find((p: any) => p.id === userId);
            if (!myData || !myData.hand || myData.hand.length === 0) {
                console.error('   ❌ No hand found or empty!');
                return;
            }

            console.log(`   My Hand: ${myData.hand.join(', ')}`);

            // Strategy: Try to play the last card (usually highest or random). 
            // Better: Play the first card (smallest).
            // Logic: If lastPlayedCards exists AND it's NOT ME, I must beat it.
            // Simplified Verification:
            // If I am leading (lastPlayedCards is null or me), play single card.
            // If I am following, I'll try to PLAY. If valid, good. If not, I'll PASS.

            const isLeading = !state.lastPlayedCards || state.lastPlayedCards.playerId === userId;

            if (isLeading) {
                const cardToPlay = myData.hand[0];
                console.log(`   Leading with ${cardToPlay}...`);
                socket.emit('client_action', {
                    roomId,
                    type: 'PLAY',
                    payload: [cardToPlay]
                });
                hasPlayed = true;
            } else {
                console.log('   Following... strict rules apply.');
                // Try to play one card high enough? Too complex for script.
                // Just PASS to verify pass logic.
                console.log('   Deciding to PASS for verification simplicity.');
                socket.emit('client_action', {
                    roomId,
                    type: 'PASS',
                    payload: null
                });
                hasPlayed = true;
            }
        } else {
            turnCount++;
            if (turnCount > 20) {
                console.warn('   ⚠️ Waited too long for turn.');
                process.exit(1); // Fail safe
            }
        }
    });

    // Wait some time for the play/pass to process and receive update
    await new Promise(r => setTimeout(r, 10000));

    if (hasPlayed) {
        console.log('   ✅ Action emitted. Check console for success/error.');
    } else {
        console.error('   ❌ Did not get a chance to play/pass.');
    }

    console.log('--- Verification Done ---');
    socket.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('Script Error:', err);
    process.exit(1);
});
