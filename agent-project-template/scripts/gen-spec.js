#!/usr/bin/env node

/**
 * gen-spec.js
 * 
 * 从 openapi.yaml 生成 api_spec.md (AI Agent 可读格式)
 * 
 * Usage: npm run gen:spec
 *        或 node scripts/gen-spec.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const OPENAPI_PATH = path.join(__dirname, '../docs/contract/openapi.yaml');
const OUTPUT_PATH = path.join(__dirname, '../docs/contract/api_spec.md');

function generateSpec() {
    // 读取 OpenAPI YAML
    const openapiContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    const spec = yaml.load(openapiContent);

    // 生成 Markdown
    let markdown = `# API Specification\n\n`;
    markdown += `> Auto-generated from \`openapi.yaml\`. Do not edit directly.\n\n`;
    markdown += `**Version**: ${spec.info.version}\n\n`;
    markdown += `**Base URL**: ${spec.servers?.[0]?.url || 'http://localhost:3001'}\n\n`;
    markdown += `---\n\n`;

    // 遍历 paths
    for (const [pathUrl, methods] of Object.entries(spec.paths || {})) {
        for (const [method, details] of Object.entries(methods)) {
            markdown += `## ${method.toUpperCase()} ${pathUrl}\n\n`;
            markdown += `**Summary**: ${details.summary || 'N/A'}\n\n`;

            // Request Body
            if (details.requestBody) {
                markdown += `**Request Body**:\n\`\`\`json\n`;
                const schema = details.requestBody.content?.['application/json']?.schema;
                if (schema?.properties) {
                    const sample = {};
                    for (const [prop, propSchema] of Object.entries(schema.properties)) {
                        sample[prop] = propSchema.example || propSchema.type;
                    }
                    markdown += JSON.stringify(sample, null, 2);
                }
                markdown += `\n\`\`\`\n\n`;
            }

            // Responses
            markdown += `**Responses**:\n`;
            for (const [code, response] of Object.entries(details.responses || {})) {
                markdown += `- \`${code}\`: ${response.description}\n`;
            }
            markdown += `\n---\n\n`;
        }
    }

    // 写入文件
    fs.writeFileSync(OUTPUT_PATH, markdown);
    console.log(`✅ Generated: ${OUTPUT_PATH}`);
}

// 检查依赖
try {
    require.resolve('js-yaml');
} catch (e) {
    console.log('Installing js-yaml...');
    require('child_process').execSync('npm install js-yaml', { stdio: 'inherit' });
}

generateSpec();
