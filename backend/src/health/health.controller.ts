import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { LangfuseService } from '../langfuse/langfuse.service';

@Controller('health')
export class HealthController {
    constructor(
        @InjectConnection() private connection: Connection,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private configService: ConfigService,
        private langfuseService: LangfuseService,
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

    @Get('langfuse')
    async checkLangfuse() {
        const baseUrl = this.configService.get('LANGFUSE_BASE_URL');
        const hasSecretKey = !!this.configService.get('LANGFUSE_SECRET_KEY');
        const hasPublicKey = !!this.configService.get('LANGFUSE_PUBLIC_KEY');

        if (!hasSecretKey || !hasPublicKey) {
            return {
                status: 'not_configured',
                message: 'Langfuse API keys not found in environment variables',
                config: { baseUrl, hasSecretKey, hasPublicKey },
            };
        }

        try {
            // 发送测试 trace
            const result = await this.langfuseService.trace(
                'health-check-trace',
                { test: true, timestamp: new Date().toISOString() },
                async () => {
                    return { success: true, message: 'Langfuse trace test completed' };
                }
            );

            return {
                status: 'ok',
                message: 'Langfuse integration working! Check your Langfuse UI for the trace.',
                config: { baseUrl, hasSecretKey, hasPublicKey },
                traceResult: result,
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                config: { baseUrl, hasSecretKey, hasPublicKey },
            };
        }
    }
}
