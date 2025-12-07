
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function debugLobby() {
    console.log('--- Debugging Lobby API ---');

    // 1. Login to get token
    console.log('1. Logging in...');
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        username: `debug_lobby_${Date.now()}`,
        password: 'password123'
    });
    const token = regRes.data.data.token;
    console.log('   Logged in.');

    // 2. Initial List
    console.log('2. Fetching Rooms (Page 1)...');
    try {
        const res = await axios.get(`${BASE_URL}/rooms?page=1&limit=20&status=waiting`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Stats:', res.data.data.pagination);
        console.log('   Rooms Count:', res.data.data.rooms.length);
        if (res.data.data.rooms.length > 0) {
            console.log('   Sample Room:', JSON.stringify(res.data.data.rooms[0], null, 2));
        } else {
            console.log('   ⚠️ Room list is empty!');
        }
    } catch (e: any) {
        console.error('   ❌ Fetch failed:', e.message);
    }

    // 3. Create a Room to verify persistence
    console.log('3. Creating a Test Room...');
    try {
        const createRes = await axios.post(`${BASE_URL}/rooms`,
            { type: 'PVP', maxPlayers: 4, name: 'Debug Room 1' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('   Created Room ID:', createRes.data.data.roomId);
    } catch (e: any) {
        console.error('   ❌ Create failed:', e.message);
    }

    // 4. List Again
    console.log('4. Fetching Rooms Again...');
    try {
        const res = await axios.get(`${BASE_URL}/rooms?page=1&limit=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Rooms Count:', res.data.data.rooms.length);
        const debugRoom = res.data.data.rooms.find((r: any) => r.name === 'Debug Room 1');
        if (debugRoom) {
            console.log('   ✅ Found created room!');
        } else {
            console.log('   ❌ Created room NOT found in list!');
        }
    } catch (e: any) {
        console.error('   ❌ Fetch failed:', e.message);
    }
}

debugLobby();
