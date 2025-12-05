
const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TOKEN = process.env.TOKEN;

async function run() {
    try {
        // 1. Create Room via REST
        console.log('Creating PvE Room...');
        const createRes = await axios.post(`${BASE_URL}/rooms`, {
            name: 'Verification Room',
            type: 'PVE',
            maxPlayers: 4,
            botCount: 3
        }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        const roomId = createRes.data.data.roomId;
        console.log(`Room Created: ${roomId}`);

        // 2. Connect Socket
        const socket = io(`${BASE_URL}/game`, {
            auth: { token: TOKEN },
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('Socket Connected');
            // 3. Join Room
            socket.emit('join_room', { roomId });
        });

        socket.on('player_joined', (data) => {
            console.log('Player Joined:', data);
        });

        socket.on('player_list_update', (data) => {
            console.log(`Player List Update: ${data.players.length} players`);
            // 4. Toggle Ready (Wait a bit to ensure join is processed)
            if (data.players.find(p => p.online && !p.ready)) {
                setTimeout(() => {
                    console.log('Toggling Ready...');
                    socket.emit('toggle_ready', { roomId, isReady: true });
                }, 500);
            }
        });

        socket.on('game_start', (data) => {
            console.log('✅ GAME START RECEIVED!');
            console.log(JSON.stringify(data));
            process.exit(0);
        });

        socket.on('error', (err) => {
            console.error('Socket Error:', err);
            process.exit(1);
        });

        // Timeout (10s)
        setTimeout(() => {
            console.error('❌ Timeout waiting for game start');
            process.exit(1);
        }, 10000);

    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

run();
