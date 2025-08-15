import { GoogleGenAI, Type } from '@google/genai';
import { LLMScores, LLMScoresCompare } from '../lib/types';
import { runLLM } from './llmUtils';
import { llmEvaluationPromptHandler, llmEvaluationPromptCompareHandler } from './prompts/handler';
import { defaultConfigOptions } from '../config/options';

export class LLMEvaluator {
    private client: GoogleGenAI;
    private llmConfig: Record<string, number>;
    private prompts?: Record<string, string>;

    constructor(
        client: GoogleGenAI,
        llmConfig: Record<string, number> = defaultConfigOptions.llm,
        prompts?: Record<string, string>) {
        this.client = client;
        this.llmConfig = llmConfig;
        this.prompts = prompts;
    }

    /**
     * Evaluates the quality of the snippets based on 3 criteria: unique information, clarity, and correct syntax
     * @returns The average score and explanation for the snippet collection
     */
    async llmEvaluate(snippets: string): Promise<LLMScores> {
        const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
        const prompt = llmEvaluationPromptHandler(snippets, snippetDelimiter, this.prompts?.llmEvaluation);

        const config: object = {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        llmAverageScore: { type: Type.NUMBER },
                        llmExplanation: { type: Type.STRING },
                    },
                    required: ["llmAverageScore", "llmExplanation"],
                },
            ...this.llmConfig
        }
        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.llmAverageScore == undefined || jsonResponse.llmExplanation == undefined) {
            throw new Error("LLM scores are undefined");
        } else {
            const llmAverageScore = jsonResponse.llmAverageScore;
            const llmExplanation = jsonResponse.llmExplanation;
            return { llmAverageScore, llmExplanation };
        }
    }

    /**
     * Compares the quality of two different snippet sources using 3 criteria: unique information, clarity, and correct syntax
     * @returns The average scores and explanations for the snippet collections
     */
    async llmEvaluateCompare(snippets: string[]): Promise<LLMScoresCompare> {
        const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
        const prompt = llmEvaluationPromptCompareHandler(snippets, snippetDelimiter, this.prompts?.llmEvaluation);
        const config: object = {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object',
                properties: {
                    llmAverageScores: { type: Type.ARRAY, minItems: 2, maxItems: 2, items: { type: Type.NUMBER } },
                    llmExplanations: { type: Type.ARRAY, minItems: 2, maxItems: 2, items: { type: Type.STRING } },
                },
                required: ["llmAverageScores", "llmExplanations"],
            },
            ...this.llmConfig
        }
        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.llmAverageScores == undefined || jsonResponse.llmExplanations == undefined) {
            throw new Error("LLM scores are undefined");
        } else {
            const llmAverageScores = jsonResponse.llmAverageScores;
            const llmExplanations = jsonResponse.llmExplanations;
            return { llmAverageScores, llmExplanations };
        }
    }
}

