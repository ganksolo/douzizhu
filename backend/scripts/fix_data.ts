import Redis from 'ioredis';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkAndFix() {
    console.log('--- STARTING DATA FIX ---');

    console.log(`DB Config: ${process.env.DATABASE_HOST} ${process.env.DATABASE_USER} ${process.env.DATABASE_NAME}`);

    // 1. Fix DB Coins
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || 'test',
        database: process.env.DATABASE_NAME || 'doudizhu_game',
    });

    console.log('Connected to DB');

    const [rows] = await connection.execute('SELECT id, nickname, coins FROM user WHERE id = ?', ['108']);
    const users = rows as any[];
    if (users.length > 0) {
        console.log(`User 108 found: ${users[0].nickname}, Coins: ${users[0].coins}`);
        await connection.execute('UPDATE user SET coins = 10000 WHERE id = ?', ['108']);
        await connection.execute('UPDATE user SET coins = 10000 WHERE id = ?', ['186']);
        console.log('Updated User 108 and 186 to 10000 coins.');
    } else {
        console.log('User 108 NOT FOUND.');
    }

    await connection.end();

    // 2. Clear Redis Rooms
    const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    console.log('Connected to Redis');

    // Scan for room keys
    const keys = await redis.keys('room:*');
    if (keys.length > 0) {
        console.log(`Found ${keys.length} room keys in Redis. Deleting...`);
        await redis.del(keys);
        console.log('Redis room data cleared.');
    } else {
        console.log('No room keys found in Redis.');
    }

    // Also clear locks
    const locks = await redis.keys('lock:room:*');
    if (locks.length > 0) {
        await redis.del(locks);
        console.log('Redis locks cleared.');
    }

    // Clear seat data
    const seats = await redis.keys('room:*:seats');
    if (seats.length > 0) {
        await redis.del(seats);
        console.log('Redis seats cleared.');
    }

    redis.disconnect();
    console.log('--- DONE ---');
    process.exit(0);
}

checkAndFix().catch(console.error);
