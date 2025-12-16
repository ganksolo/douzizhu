
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load dotenv
try {
    const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
    if (result.error) throw result.error;
} catch (e) {
    console.log('Dotenv not found or failed, assuming environment variables are set or using defaults.');
}

async function main() {
    console.log('Connecting to database...');

    const config = {
        host: process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT) || 3306,
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || 'test',
        database: process.env.DATABASE_NAME || 'doudizhu',
    };

    console.log(`Config: ${config.host}:${config.port} User: ${config.user} DB: ${config.database}`);

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected.');

        // Schema Sync: Ensure column exists
        try {
            await connection.execute("SELECT coins FROM user LIMIT 1");
        } catch (e) {
            if (e.code === 'ER_BAD_FIELD_ERROR') {
                console.log('Column coins missing. Adding it...');
                await connection.execute("ALTER TABLE user ADD COLUMN coins INT DEFAULT 1000");
                console.log('Column added.');
            } else {
                throw e;
            }
        }

        // Update Registered Users
        // Force set to 10000 as per request "Default have 10000" (implies reset for new feature)
        const [res1] = await connection.execute(
            "UPDATE user SET coins = 10000 WHERE auth_type = 'password'"
        );
        console.log(`Updated Registered Users (Set to 10000): ${(res1 as any).affectedRows}`);

        // Update Guests
        // Force set to 1000
        const [res2] = await connection.execute(
            "UPDATE user SET coins = 1000 WHERE auth_type = 'guest'"
        );
        console.log(`Updated Guest Users (Set to 1000): ${(res2 as any).affectedRows}`);

        await connection.end();
        console.log('Done.');
    } catch (error) {
        console.error('Migration Failed:', error.message);
    }
}

main();
