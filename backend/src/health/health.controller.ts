import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('health')
export class HealthController {
    constructor(
        @InjectConnection() private connection: Connection,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private configService: ConfigService,
    ) { }

    @Get()
    async checkHealth() {
        const results = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: await this.checkDatabase(),
                redis: await this.checkRedis(),
            },
            config: {
                port: this.configService.get('PORT'),
                database: {
                    host: this.configService.get('DATABASE_HOST'),
                    port: this.configService.get('DATABASE_PORT'),
                    name: this.configService.get('DATABASE_NAME'),
                },
                redis: {
                    host: this.configService.get('REDIS_HOST'),
                    port: this.configService.get('REDIS_PORT'),
                },
            },
        };

        return results;
    }

    private async checkDatabase() {
        try {
            await this.connection.query('SELECT 1');
            return {
                status: 'connected',
                type: 'mysql',
                message: 'MySQL connection successful',
            };
        } catch (error) {
            return {
                status: 'error',
                type: 'mysql',
                message: error.message,
            };
        }
    }

    private async checkRedis() {
        try {
            const testKey = 'health_check_test';
            const testValue = Date.now().toString();

            await this.cacheManager.set(testKey, testValue, 5000);
            const retrievedValue = await this.cacheManager.get(testKey);

            if (retrievedValue === testValue) {
                await this.cacheManager.del(testKey);
                return {
                    status: 'connected',
                    type: 'redis',
                    message: 'Redis connection successful',
                };
            } else {
                return {
                    status: 'error',
                    type: 'redis',
                    message: 'Redis read/write test failed',
                };
            }
        } catch (error) {
            return {
                status: 'error',
                type: 'redis',
                message: error.message,
            };
        }
    }
}
