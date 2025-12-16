
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function main() {
    const config = {
        host: process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT) || 3306,
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || 'test',
        database: process.env.DATABASE_NAME || 'doudizhu',
    };

    try {
        const connection = await mysql.createConnection(config);

        // Check ganksolopc (186)
        const [rows] = await connection.execute("SELECT id, nickname, auth_type, coins FROM user WHERE id = '186'");
        console.log('User 186:', rows[0]);

        // Check ganksolo (108)
        const [rows2] = await connection.execute("SELECT id, nickname, auth_type, coins FROM user WHERE id = '108'");
        console.log('User 108:', rows2[0]);

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
main();
