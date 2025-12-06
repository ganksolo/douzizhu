import Redis from 'ioredis';

async function flushRooms() {
    const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    });

    try {
        const keys = await redis.keys('room:*');
        if (keys.length === 0) {
            console.log('No room keys found.');
            return;
        }

        console.log(`Found ${keys.length} room keys. Deleting...`);
        await redis.del(...keys);
        console.log('All room keys deleted successfully.');
    } catch (error) {
        console.error('Error flushing rooms:', error);
    } finally {
        redis.disconnect();
    }
}

flushRooms();
