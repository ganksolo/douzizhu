
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function diagnose() {
    console.log('--- DB DIAGNOSTICS ---');
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    // 1. Check Schema
    console.log('\n1. Checking Table Schema:');
    const columns = await dataSource.query(`SHOW COLUMNS FROM user`);
    const hashCol = columns.find((c: any) => c.Field === 'password_hash');
    console.log('password_hash Column:', hashCol);

    // 2. Check Data
    console.log('\n2. Checking User Data:');
    const users = await dataSource.query(`SELECT id, nickname, auth_type, password_hash FROM user`);

    console.table(users.map((u: any) => ({
        id: u.id,
        nickname: u.nickname,
        auth_type: u.auth_type,
        hash_len: u.password_hash ? u.password_hash.length : 'NULL',
        hash_preview: u.password_hash ? u.password_hash.substring(0, 10) + '...' : 'NULL'
    })));

    await app.close();
}

diagnose();
