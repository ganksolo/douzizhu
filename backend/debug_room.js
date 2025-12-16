const Redis = require('ioredis');

async function main() {
    const redis = new Redis({
        host: 'localhost',
        port: 6379
    });

    const roomPattern = 'room:*:meta';
    const keys = await redis.keys(roomPattern);

    console.log(`Found ${keys.length} rooms.`);

    for (const key of keys) {
        const roomId = key.split(':')[1];
        console.log(`\nChecking Room: ${roomId}`);

        const meta = await redis.hgetall(`room:${roomId}:meta`);
        console.log('Meta:', meta);

        const seats = await redis.hgetall(`room:${roomId}:seats`);
        console.log('Seats:');
        let ownerFound = false;
        for (const [k, v] of Object.entries(seats)) {
            const p = JSON.parse(v);
            console.log(`  Seat ${k}: ID=${p.userId} Name=${p.nickname || p.username}`);
            if (String(p.userId) === String(meta.ownerId)) {
                ownerFound = true;
                console.log(`  ✅ Owner Found in Seat ${k} with name: ${p.nickname || p.username}`);
            }
        }

        if (!ownerFound) {
            console.log(`  ❌ Owner ${meta.ownerId} NOT found in seats!`);
        }
    }

    redis.disconnect();
}

main();
