import * as dotenv from 'dotenv';
import * as path from 'path';

// 手动加载 .env 文件 - 必须在 Langfuse 初始化前执行
// 编译后代码在 dist/ 目录，所以需要向上两级
const envPath = path.resolve(process.cwd(), '.env');
console.log(`[Langfuse] Loading env from: ${envPath}`);
dotenv.config({ path: envPath });
console.log(`[Langfuse] LANGFUSE_BASE_URL: ${process.env.LANGFUSE_BASE_URL}`);
console.log(`[Langfuse] LANGFUSE_PUBLIC_KEY exists: ${!!process.env.LANGFUSE_PUBLIC_KEY}`);

import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// 显式配置 Langfuse span processor（适用于 self-hosted）
const langfuseProcessor = new LangfuseSpanProcessor({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'http://localhost:3000',
});

console.log(`[Langfuse] SpanProcessor configured with baseUrl: ${process.env.LANGFUSE_BASE_URL || 'http://localhost:3000'}`);

const sdk = new NodeSDK({
    spanProcessors: [langfuseProcessor],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('✅ Langfuse SDK shut down successfully'))
        .catch((error) => console.error('❌ Error shutting down Langfuse SDK', error));
});

console.log('✅ Langfuse OpenTelemetry instrumentation initialized');
