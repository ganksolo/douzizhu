import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000/game';
const ROOM_ID = 'test-room-1';

function createClient(playerId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            forceNew: true,
        });

        socket.on('connect', () => {
            console.log(`[${playerId}] Connected: ${socket.id}`);
            resolve(socket);
        });

        socket.on('connect_error', (err) => {
            console.error(`[${playerId}] Connection Error:`, err.message);
            reject(err);
        });
    });
}

async function runTest() {
    console.log('Starting E2E Verification...');

    try {
        // 1. Connect Clients
        const clientA = await createClient('player-A');
        const clientB = await createClient('player-B');

        // 2. Join Room
        console.log('\n--- Joining Room ---');
        clientA.emit('join_room', { roomId: ROOM_ID, playerId: 'player-A' });
        clientB.emit('join_room', { roomId: ROOM_ID, playerId: 'player-B' });

        // 3. Listen for State Updates
        clientA.on('sync_state', (state) => {
            console.log(`\n[player-A] Received State: ${state.currentState}`);
            console.log(`[player-A] Current Turn: ${state.currentTurn}`);
            console.log(`[player-A] Players: ${state.players.map(p => p.id).join(', ')}`);
            console.log(`[player-A] My Hand Count: ${state.players.find(p => p.id === 'player-A')?.hand?.length || 0}`);

            // Check Fog of War
            const playerB = state.players.find(p => p.id === 'player-B');
            if (playerB && playerB.hand) {
                console.error('❌ [player-A] ERROR: I can see Player B\'s hand!');
            } else if (playerB) {
                console.log('✅ [player-A] Fog of War working: Player B\'s hand is hidden.');
            }

            if (state.currentState === 'PlayingState') {
                console.log('✅ Game reached PlayingState!');

                // 4. Perform Action (if it's my turn)
                if (state.currentTurn === 'player-A') {
                    console.log('\n--- Player A Playing Cards ---');
                    clientA.emit('client_action', {
                        roomId: ROOM_ID,
                        playerId: 'player-A',
                        type: 'PLAY',
                        payload: ['♠3'],
                    });
                }
            }
        });

        clientB.on('sync_state', (state) => {
            // console.log(`[player-B] Received State: ${state.currentState}`);
            if (state.lastPlayedCards && state.lastPlayedCards.playerId === 'player-A') {
                console.log('✅ [player-B] Saw Player A play cards:', state.lastPlayedCards.cards);
                console.log('🎉 Verification Successful!');
                process.exit(0);
            }
        });

        clientA.on('exception', (err) => console.error('[player-A] Exception:', err));
        clientB.on('exception', (err) => console.error('[player-B] Exception:', err));

        // Keep alive for a bit
        setTimeout(() => {
            console.log('Timeout - Test finished (or stuck)');
            process.exit(1);
        }, 10000);

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
}

runTest();
