
import { io } from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/game';

async function main() {
    try {
        console.log('--- Starting Phase 29 Verification ---');

        // 1. Login
        console.log('[1] Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/guest-login`);
        const token = loginRes.data.data.token;
        const userId = loginRes.data.data.userId;
        console.log(`    Logged in as ${loginRes.data.data.username} (${userId})`);

        // 2. Create Room
        console.log('[2] Creating Room...');
        const createRes = await axios.post(
            `${API_URL}/rooms`,
            { name: 'Phase29 Test Room', type: 'PVE', botCount: 0 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const roomId = createRes.data.data.roomId;
        console.log(`    Room Created: ${roomId}`);

        // 3. Connect Socket
        console.log('[3] Connecting Socket...');
        const socket = io(WS_URL, {
            auth: { token },
            transports: ['websocket']
        });

        await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => {
                console.log('    Socket Connected');
                resolve();
            });
            socket.on('connect_error', (err) => reject(err));
        });

        // 4. Join Room
        console.log('[4] Joining Room...');
        socket.emit('join_room', { roomId });

        await new Promise<void>((resolve) => {
            socket.on('player_list_update', (data) => {
                if (data.roomId === roomId) {
                    console.log(`    Received player_list_update. Players: ${data.players.length}`);
                    // Only resolve if we see ourselves
                    if (data.players.find((p: any) => p.userId === userId)) {
                        resolve();
                    }
                }
            });
        });

        // 5. Add Bots (Need 2 bots for a 3-player game, or just fill it up)
        // Default maxPlayers is 4 in CreateRoom unless specified.
        // Let's add 3 bots to fill a 4-player room.
        console.log('[5] Adding Bots...');

        let playerCount = 1;
        while (playerCount < 4) {
            await axios.post(`${API_URL}/rooms/${roomId}/ai`, {}, { headers: { Authorization: `Bearer ${token}` } });
            console.log(`    Bot added. Current Players: ${++playerCount}`);
            await new Promise(r => setTimeout(r, 500)); // Wait a bit
        }

        // 6. Toggle Ready
        console.log('[6] Toggling Ready...');
        socket.emit('toggle_ready', { roomId, isReady: true });

        // 7. Wait for Game Start
        console.log('[7] Waiting for Game Start...');
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Game Start Timeout')), 5000);

            socket.on('game_start', (data) => {
                if (data.roomId === roomId) {
                    console.log('    ✅ Game Start Event Received!');
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        console.log('--- Phase 29 Verification PASSED ---');
        socket.disconnect();
        process.exit(0);

    } catch (error: any) {
        console.error('--- Verification FAILED ---');
        if (error.response) {
            console.error('API Error Status:', error.response.status);
            console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error Message:', error.message);
            console.error('stack:', error.stack);
        }
        process.exit(1);
    }
}

main();
