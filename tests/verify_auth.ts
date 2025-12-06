
import axios from 'axios';

const API_URL = 'http://localhost:3001/auth';

async function testAuth() {
    console.log('--- Starting Auth API Verification ---');
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const password = 'password123';

    try {
        // 1. Register
        console.log(`\n1. Testing Register (${username})...`);
        await axios.post(`${API_URL}/register`, { username, password });
        console.log('✅ Register Passed');

        // 2. Login
        console.log(`\n2. Testing Login (${username})...`);
        const loginRes = await axios.post(`${API_URL}/login`, { username, password });
        console.log('✅ Login Passed', loginRes.data);

        // 3. Login Failure
        console.log('\n3. Testing Login Failure...');
        try {
            await axios.post(`${API_URL}/login`, { username, password: 'wrongpassword' });
            console.error('❌ Login Failure Test FAILED (Should have thrown error)');
        } catch (e: any) {
            console.log(`✅ Login Failure Passed (Got ${e.response?.status})`);
        }

    } catch (e: any) {
        if (e.response) {
            console.error('!!! Verification Failed Exception !!!');
            console.error('Status:', e.response.status);
            console.error('Data:', e.response.data);
        } else {
            console.error('!!! Network/Script Error !!!', e.message);
        }
    }
}

testAuth();
