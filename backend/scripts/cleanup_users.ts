
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function cleanup() {
    console.log('--- CLEANUP DIAGNOSTICS ---');
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    console.log('Deleting users with short hashes (< 60 chars)...');

    // Using direct query for safety and speed
    const result = await dataSource.query(`
        DELETE FROM user 
        WHERE auth_type = 'password' 
        AND CHAR_LENGTH(password_hash) < 60
    `);

    console.log('Result:', result);
    console.log('✅ Cleanup Complete');

    await app.close();
}

cleanup();
