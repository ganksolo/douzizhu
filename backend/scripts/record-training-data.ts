#!/usr/bin/env npx ts-node
/**
 * Agent Training Data Recorder (Extended for Multi-Agent Workflow)
 * Records agent training data to Langfuse Datasets for prompt optimization
 * 
 * Supports:
 * - BE/FE/QA Agent distinction
 * - Multi-prompt loading (role + loader)
 * - Phase-based task structure
 * - QA verification tracking
 * - Related task linking
 * 
 * Usage:
 *   npx ts-node scripts/record-training-data.ts
 *   npm run record-case
 */

import { Langfuse } from 'langfuse';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Langfuse client
const langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'http://localhost:3000',
});

// Dataset name
const DATASET_NAME = 'agent-training-data';

// Agent types
type AgentType = 'BE' | 'FE' | 'QA';

// Interface for training data
interface TrainingData {
    // === Agent Identity ===
    agent_type: AgentType;
    prompts_loaded: string[];           // e.g., ["ddz.role.be", "ddz.orch.be_loader"]

    // === Task Structure ===
    phase_id: string;                   // e.g., "28.3"
    phase_title: string;                // e.g., "Add AI Player Logic"
    parent_phase: string;               // e.g., "28" (for linking related tasks)
    task_context: string;               // Context section from task prompt
    requirements: string;               // Requirements section

    // === Base Fields ===
    input: string;                      // Full task prompt given to agent
    output: string;                     // Agent's actual response
    golden: string;                     // Correct/expected output
    score: number;                      // Overall score
    comment: string;                    // Summary of issues

    // === Model & Context ===
    model: string;
    tech_stack: string[];

    // === Detailed Scores ===
    scores: {
        correctness: number;
        completeness: number;
        code_quality: number;
        efficiency: number;
    };

    // === Error Classification ===
    error_types: string[];

    // === QA Specific ===
    qa_verified: boolean;
    qa_issues: string[];
    qa_handoff_met: boolean;            // Whether QA handoff criteria were met

    // === Task Linking ===
    related_phases: string[];           // e.g., ["28.3", "28.4", "28.5"]
    depends_on: string[];               // Phase IDs this depends on

    // === Metadata ===
    iterations: number;
    tokens_in: number;
    tokens_out: number;
    session_id: string;
    record_id: string;                  // Unique ID for this record
}

// Readline interface for interactive input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

async function collectMultilineInput(): Promise<string> {
    const lines: string[] = [];
    let emptyLineCount = 0;

    return new Promise((resolve) => {
        const lineHandler = (line: string) => {
            if (line === '') {
                emptyLineCount++;
                if (emptyLineCount >= 2) {
                    rl.removeListener('line', lineHandler);
                    resolve(lines.join('\n'));
                    return;
                }
            } else {
                emptyLineCount = 0;
            }
            lines.push(line);
        };

        rl.on('line', lineHandler);
    });
}

function generateRecordId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `rec-${timestamp}-${random}`;
}

async function collectData(): Promise<TrainingData> {
    console.log('\n🎯 Agent Training Data Recorder (Multi-Agent Edition)\n');
    console.log('='.repeat(60));

    // Generate unique record ID
    const record_id = generateRecordId();
    console.log(`Record ID: ${record_id}\n`);

    // === Agent Identity ===
    console.log('📋 AGENT IDENTITY');
    console.log('-'.repeat(40));

    console.log('Agent Types: 1=BE (Backend), 2=FE (Frontend), 3=QA (Quality Assurance)');
    const agentChoice = await question('Agent Type (1-3): ') || '1';
    const agentTypes: Record<string, AgentType> = { '1': 'BE', '2': 'FE', '3': 'QA' };
    const agent_type = agentTypes[agentChoice] || 'BE';

    // Prompt suggestions based on agent type
    const promptSuggestions: Record<AgentType, string[]> = {
        'BE': ['ddz.role.be', 'ddz.orch.be_loader'],
        'FE': ['ddz.role.fe', 'ddz.orch.fe_loader'],
        'QA': ['ddz.role.qa', 'ddz.orch.qa_loader'],
    };
    const defaultPrompts = promptSuggestions[agent_type].join(', ');
    const promptsInput = await question(`Prompts Loaded (default: ${defaultPrompts}): `) || defaultPrompts;
    const prompts_loaded = promptsInput.split(',').map(s => s.trim()).filter(Boolean);

    const model = await question('Model (e.g., claude-opus-4.5): ') || 'claude-opus-4.5';
    const session_id = await question('Session/Chat ID: ') || `chat-${Date.now()}`;

    // === Task Structure ===
    console.log('\n📋 TASK STRUCTURE');
    console.log('-'.repeat(40));

    const phase_id = await question('Phase ID (e.g., 28.3): ') || '';
    const phase_title = await question('Phase Title (e.g., Add AI Player Logic): ') || '';
    const parent_phase = await question('Parent Phase (e.g., 28, for linking): ') || phase_id.split('.')[0];

    console.log('\nTask Context (press Enter twice to finish):');
    const task_context = await collectMultilineInput();

    console.log('\nRequirements (press Enter twice to finish):');
    const requirements = await collectMultilineInput();

    // Related phases
    const relatedInput = await question('Related Phases (comma-separated, e.g., 28.3,28.4,28.5): ') || '';
    const related_phases = relatedInput.split(',').map(s => s.trim()).filter(Boolean);

    const dependsInput = await question('Depends On (phases this depends on): ') || '';
    const depends_on = dependsInput.split(',').map(s => s.trim()).filter(Boolean);

    // Tech stack
    const techStackInput = await question('Tech Stack (comma-separated): ') || 'React,TypeScript,NestJS';
    const tech_stack = techStackInput.split(',').map(s => s.trim()).filter(Boolean);

    // === Input/Output/Golden ===
    console.log('\n📋 AGENT INTERACTION');
    console.log('-'.repeat(40));

    console.log('\n--- Input (Full Task Prompt) ---');
    console.log('Enter the task prompt given to agent (press Enter twice to finish):');
    const input = await collectMultilineInput();

    console.log('\n--- Output (Agent Response) ---');
    console.log('Enter the agent output (press Enter twice to finish):');
    const output = await collectMultilineInput();

    console.log('\n--- Golden (Correct/Expected Output) ---');
    console.log('Enter expected output (or "same" if output is correct, or "skip" to leave empty):');
    const goldenInput = await collectMultilineInput();
    const golden = goldenInput.toLowerCase() === 'same' ? output :
        goldenInput.toLowerCase() === 'skip' ? '' : goldenInput;

    // === Scoring ===
    console.log('\n📋 SCORING (0.0 - 1.0)');
    console.log('-'.repeat(40));

    const correctness = parseFloat(await question('Correctness: ') || '0.5');
    const completeness = parseFloat(await question('Completeness: ') || '0.5');
    const code_quality = parseFloat(await question('Code Quality: ') || '0.5');
    const efficiency = parseFloat(await question('Efficiency: ') || '0.5');

    const defaultScore = ((correctness + completeness + code_quality + efficiency) / 4).toFixed(2);
    const scoreInput = await question(`Overall Score (default: ${defaultScore}): `) || defaultScore;
    const score = parseFloat(scoreInput);

    // Error types
    console.log('\nError Types (comma-separated):');
    console.log('  Options: missing_feature, logic_error, integration_issue, style_issue, wrong_file, misunderstanding, none');
    const errorTypesInput = await question('Error Types: ') || 'none';
    const error_types = errorTypesInput.split(',').map(s => s.trim()).filter(s => s && s !== 'none');

    const comment = await question('\nComment (summary of issues): ') || '';

    // === QA Specific ===
    console.log('\n📋 QA VERIFICATION');
    console.log('-'.repeat(40));

    const qaVerifiedInput = await question('QA Verified? (y/n/pending): ') || 'pending';
    const qa_verified = qaVerifiedInput.toLowerCase() === 'y';

    const qaHandoffInput = await question('QA Handoff Criteria Met? (y/n): ') || 'n';
    const qa_handoff_met = qaHandoffInput.toLowerCase() === 'y';

    const qaIssuesInput = await question('QA Issues Found (comma-separated, or "none"): ') || 'none';
    const qa_issues = qaIssuesInput.split(',').map(s => s.trim()).filter(s => s && s !== 'none');

    // === Metadata ===
    console.log('\n📋 METADATA');
    console.log('-'.repeat(40));

    const iterations = parseInt(await question('Iterations to complete (default 1): ') || '1', 10);
    const tokens_in = parseInt(await question('Tokens In (estimate, 0 if unknown): ') || '0', 10);
    const tokens_out = parseInt(await question('Tokens Out (estimate, 0 if unknown): ') || '0', 10);

    return {
        record_id,
        agent_type,
        prompts_loaded,
        phase_id,
        phase_title,
        parent_phase,
        task_context,
        requirements,
        input,
        output,
        golden,
        score,
        comment,
        model,
        tech_stack,
        scores: {
            correctness,
            completeness,
            code_quality,
            efficiency,
        },
        error_types,
        qa_verified,
        qa_issues,
        qa_handoff_met,
        related_phases,
        depends_on,
        iterations,
        tokens_in,
        tokens_out,
        session_id,
    };
}

async function uploadToLangfuse(data: TrainingData): Promise<void> {
    console.log('\n📤 Uploading to Langfuse...');

    try {
        await langfuse.createDatasetItem({
            datasetName: DATASET_NAME,
            input: {
                // Agent identity
                agent_type: data.agent_type,
                prompts_loaded: data.prompts_loaded,
                model: data.model,

                // Task structure
                phase_id: data.phase_id,
                phase_title: data.phase_title,
                parent_phase: data.parent_phase,
                task_context: data.task_context,
                requirements: data.requirements,

                // The actual request
                request: data.input,

                // Context
                tech_stack: data.tech_stack,
                related_phases: data.related_phases,
                depends_on: data.depends_on,
            },
            expectedOutput: data.golden,
            metadata: {
                record_id: data.record_id,
                output: data.output,
                score: data.score,
                scores: data.scores,
                comment: data.comment,
                error_types: data.error_types,

                // QA specific
                qa_verified: data.qa_verified,
                qa_issues: data.qa_issues,
                qa_handoff_met: data.qa_handoff_met,

                // Metadata
                iterations: data.iterations,
                tokens_in: data.tokens_in,
                tokens_out: data.tokens_out,
                session_id: data.session_id,
                timestamp: new Date().toISOString(),
            },
        });

        await langfuse.flushAsync();
        console.log('✅ Successfully uploaded to Langfuse dataset: ' + DATASET_NAME);
        console.log(`📝 Record ID: ${data.record_id}`);
        console.log('\n💡 Tip: Use the Record ID to link related tasks');
    } catch (error) {
        console.error('❌ Failed to upload:', error);
        throw error;
    }
}

async function main() {
    try {
        if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
            console.error('❌ Missing LANGFUSE_SECRET_KEY or LANGFUSE_PUBLIC_KEY in .env');
            process.exit(1);
        }

        const data = await collectData();

        // Show summary
        console.log('\n📋 SUMMARY');
        console.log('='.repeat(60));
        console.log(`Record ID: ${data.record_id}`);
        console.log(`Agent: ${data.agent_type} Agent`);
        console.log(`Prompts: ${data.prompts_loaded.join(', ')}`);
        console.log(`Model: ${data.model}`);
        console.log(`Phase: ${data.phase_id} - ${data.phase_title}`);
        console.log(`Parent Phase: ${data.parent_phase}`);
        console.log(`Related Phases: ${data.related_phases.join(', ') || 'None'}`);
        console.log(`Tech Stack: ${data.tech_stack.join(', ')}`);
        console.log(`\nOverall Score: ${data.score}`);
        console.log(`Scores: correctness=${data.scores.correctness}, completeness=${data.scores.completeness}, quality=${data.scores.code_quality}, efficiency=${data.scores.efficiency}`);
        console.log(`Error Types: ${data.error_types.length > 0 ? data.error_types.join(', ') : 'None'}`);
        console.log(`\nQA Verified: ${data.qa_verified ? 'Yes' : 'No/Pending'}`);
        console.log(`QA Handoff Met: ${data.qa_handoff_met ? 'Yes' : 'No'}`);
        console.log(`QA Issues: ${data.qa_issues.length > 0 ? data.qa_issues.join(', ') : 'None'}`);
        console.log(`\nIterations: ${data.iterations}`);
        console.log(`Comment: ${data.comment || 'N/A'}`);

        const confirm = await question('\nUpload to Langfuse? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
            await uploadToLangfuse(data);
        } else {
            console.log('❌ Cancelled');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        rl.close();
    }
}

main();
