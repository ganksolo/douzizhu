
import axios from 'axios';

const API_URL = 'http://localhost:3001/auth';

async function runEdgeCases() {
    console.log('🔥🔥🔥 STARTING QA EDGE CASE VERIFICATION 🔥🔥🔥\n');

    const timestamp = Date.now();
    const baseUser = `qa_${timestamp}`;

    // --- 1. Input Validation ---
    console.log('--- 1. Input Validation ---');

    // Empty Payload
    try {
        console.log('Testing Empty Payload...');
        await axios.post(`${API_URL}/register`, {});
        console.error('❌ Failed: Empty payload accepted (Expected 400)');
    } catch (e: any) {
        console.log(`✅ Passed: Empty payload rejected (${e.response?.status})`);
    }

    // Min Length Username
    try {
        console.log('Testing Short Username ("a")...');
        await axios.post(`${API_URL}/register`, { username: 'a', password: 'password123' });
        // Passing this depends on specific validation rules, assuming > 1 or > 3
        console.warn('⚠️ Warning: Short username accepted (Check policy)');
    } catch (e: any) {
        console.log(`✅ Passed: Short username rejected (${e.response?.status} - ${JSON.stringify(e.response?.data)})`);
    }

    // Max Length Username (256 chars)
    try {
        console.log('Testing Long Username (256 chars)...');
        const longName = 'a'.repeat(256);
        await axios.post(`${API_URL}/register`, { username: longName, password: 'password123' });
        console.error('❌ Failed: 256 char username accepted (Expected limit)');
    } catch (e: any) {
        console.log(`✅ Passed: Long username rejected (${e.response?.status})`);
    }

    // Short Password
    try {
        console.log('Testing Short Password ("123")...');
        await axios.post(`${API_URL}/register`, { username: `${baseUser}_short`, password: '123' });
        console.error('❌ Failed: Short password accepted (Expected 400)');
    } catch (e: any) {
        console.log(`✅ Passed: Short password rejected (${e.response?.status})`);
    }

    // Injection Attempt
    try {
        console.log('Testing SQL Injection Name ("admin\' --")...');
        const res = await axios.post(`${API_URL}/register`, { username: "admin' --", password: 'password123' });
        console.log('ℹ️ Info: Injection username accepted as literal (Standard behavior if parameterized)');
        if (res.data.data.username === "admin' --") {
            console.log('✅ Passed: Stored literally, no crashes');
        }
    } catch (e: any) {
        console.log(`✅ Passed: Injection username rejected/handled (${e.response?.status})`);
    }

    // --- 2. Security & Logic ---
    console.log('\n--- 2. Security & Logic ---');

    let validToken = '';

    // Register Valid User
    try {
        const res = await axios.post(`${API_URL}/register`, { username: baseUser, password: 'password123' });
        validToken = res.data.data.token;
        console.log('✅ Setup: Valid user registered');

        // Check for Data Leakage in Register Response
        if (res.data.data.password || res.data.data.passwordHash) {
            console.error('❌ CRITICAL: Password/Hash leaked in Register response!');
        } else {
            console.log('✅ Passed: No sensitive data in Register response');
        }

    } catch (e) {
        console.error('❌ Setup Failed: Could not register verify user');
        return;
    }

    // Duplicate Register
    try {
        console.log('Testing Duplicate Registration...');
        await axios.post(`${API_URL}/register`, { username: baseUser, password: 'password123' });
        console.error('❌ Failed: Duplicate username accepted');
    } catch (e: any) {
        console.log(`✅ Passed: Duplicate rejected (${e.response?.status})`);
    }

    // Auth Bypass
    try {
        console.log('Testing Auth Bypass (GET /auth/me without token)...');
        await axios.get(`${API_URL}/me`);
        console.error('❌ Failed: Protected route accessed without token');
    } catch (e: any) {
        console.log(`✅ Passed: Protected route denied (${e.response?.status})`);
    }

    // Data Leakage /me
    try {
        console.log('Testing Data Leakage in /auth/me...');
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${validToken}` }
        });
        if (meRes.data.password || meRes.data.passwordHash) {
            console.error('❌ CRITICAL: Password/Hash leaked in /me response!');
        } else {
            console.log('✅ Passed: No sensitive data in /me response');
        }
    } catch (e: any) {
        console.error('❌ Failed: Could not access /me with valid token');
    }

    // Enumeration Check (Login)
    console.log('Testing Enumeration (Compare Error Messages)...');
    let msg1 = '', msg2 = '';
    try {
        await axios.post(`${API_URL}/login`, { username: baseUser, password: 'wrongpassword' });
    } catch (e: any) {
        msg1 = JSON.stringify(e.response?.data);
    }

    try {
        await axios.post(`${API_URL}/login`, { username: `nonexistent_${timestamp}`, password: 'password123' });
    } catch (e: any) {
        msg2 = JSON.stringify(e.response?.data);
    }

    console.log(`  Wrong Pass Msg: ${msg1}`);
    console.log(`  No User Msg:    ${msg2}`);
    if (msg1 === msg2) {
        console.log('✅ Passed: API returns identical errors (No Enumeration)');
    } else {
        console.warn('⚠️ Warning: API returns different errors (Enumeration Risk)');
    }

    console.log('\n🔥🔥🔥 QA COMPLETE 🔥🔥🔥');
}

runEdgeCases();
