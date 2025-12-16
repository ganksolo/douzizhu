const Redis = require('ioredis');

async function main() {
    const redis = new Redis({
        host: 'localhost',
        port: 6379
    });

    const roomPattern = 'room:*:meta';
    const keys = await redis.keys(roomPattern);

    console.log(`Found ${keys.length} rooms to check.`);
    let fixedCount = 0;

    for (const key of keys) {
        const roomId = key.split(':')[1];

        const meta = await redis.hgetall(`room:${roomId}:meta`);

        if (meta.ownerName && meta.ownerName !== 'Unknown') {
            // Already good
            continue;
        }

        console.log(`\nFixing Room: ${roomId} (Owner: ${meta.ownerId})`);

        // Find owner in seats
        const seats = await redis.hgetall(`room:${roomId}:seats`);
        let hostName = null;

        for (const [k, v] of Object.entries(seats)) {
            try {
                const p = JSON.parse(v);
                // Loose string check
                if (String(p.userId).trim() === String(meta.ownerId).trim()) {
                    hostName = p.nickname || p.username;
                    break;
                }
            } catch (e) { }
        }

        if (hostName) {
            console.log(`  ✅ Found Host Name: "${hostName}" in Seat. Updating Meta...`);
            await redis.hset(`room:${roomId}:meta`, 'ownerName', hostName);
            fixedCount++;
        } else {
            // Fallback: Check DB if needed, but script focuses on Room Data
            console.log(`  ❌ Could not find owner in seats.`);
        }
    }

    console.log(`\nDone. Fixed ${fixedCount} rooms.`);
    redis.disconnect();
}

main();
