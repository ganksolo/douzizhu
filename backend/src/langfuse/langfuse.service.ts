import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LangfuseClient } from '@langfuse/client';
import { startActiveObservation, updateActiveObservation } from '@langfuse/tracing';

@Injectable()
export class LangfuseService implements OnModuleInit {
    private readonly logger = new Logger(LangfuseService.name);
    private client: LangfuseClient;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const secretKey = this.configService.get<string>('LANGFUSE_SECRET_KEY');
        const publicKey = this.configService.get<string>('LANGFUSE_PUBLIC_KEY');
        const baseUrl = this.configService.get<string>('LANGFUSE_BASE_URL');

        if (!secretKey || !publicKey) {
            this.logger.warn('Langfuse API keys not configured. Tracing disabled.');
            return;
        }

        this.client = new LangfuseClient({
            secretKey,
            publicKey,
            baseUrl: baseUrl || 'http://localhost:3000',
        });
        this.logger.log(`✅ Langfuse client initialized (baseUrl: ${baseUrl || 'http://localhost:3000'})`);
    }

    /**
     * 获取 Langfuse 中存储的 prompt
     * @param name Prompt 名称
     * @param options 可选参数 (version, label)
     */
    async getPrompt(name: string, options?: { version?: number; label?: string }) {
        if (!this.client) {
            throw new Error('Langfuse client not initialized. Check API keys configuration.');
        }
        return this.client.prompt.get(name, options);
    }

    /**
     * 开始一个带追踪的 LLM 生成观察
     * @param name Trace 名称
     * @param promptName Langfuse 中的 prompt 名称
     * @param input Prompt 变量
     * @param callback 包含 LLM 调用的回调函数
     */
    async traceGeneration<T>(
        name: string,
        promptName: string,
        input: Record<string, unknown>,
        callback: (compiledPrompt: string) => Promise<T>
    ): Promise<T> {
        const prompt = await this.getPrompt(promptName);
        const compiledPrompt = prompt.compile(input as Record<string, string>);

        return startActiveObservation(
            name,
            async (span) => {
                span.update({
                    input: compiledPrompt,
                    metadata: { promptName, promptVersion: prompt.version },
                });
                updateActiveObservation({ prompt }, { asType: 'generation' });

                const result = await callback(compiledPrompt);

                span.update({ output: result });
                return result;
            },
            { asType: 'generation' }
        );
    }

    /**
     * 创建自定义 trace span
     * @param name Span 名称
     * @param input 输入数据
     * @param callback 业务逻辑回调
     */
    async trace<T>(
        name: string,
        input: unknown,
        callback: () => Promise<T>
    ): Promise<T> {
        return startActiveObservation(name, async (span) => {
            span.update({ input });
            const result = await callback();
            span.update({ output: result });
            return result;
        });
    }

    /**
     * 获取 Langfuse 客户端实例 (用于高级用例)
     */
    getClient(): LangfuseClient | undefined {
        return this.client;
    }
}
