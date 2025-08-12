import { GoogleGenAI, Type } from '@google/genai';
import { LLMScores, LLMScoresCompare } from './types';
import { runLLM } from './utils';
import { llmEvaluationPrompt, llmEvaluationPromptCompare } from './prompts';

export class LLMEvaluator {
    private client: GoogleGenAI;
    private llmConfig: Record<string, any>;
    private prompts?: Record<string, any>;

    constructor(client: GoogleGenAI, llmConfig: Record<string, any>, prompts?: Record<string, any>) {
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
        const prompt = llmEvaluationPrompt(snippets, snippetDelimiter, this.prompts?.llmEvaluation);

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
        const prompt = llmEvaluationPromptCompare(snippets, snippetDelimiter, this.prompts?.llmEvaluation);
        const config: object = {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object',
                properties: {
                    llmAverageScores: { type: Type.ARRAY, minItems: snippets.length, items: { type: Type.NUMBER } },
                    llmExplanations: { type: Type.ARRAY, minItems: snippets.length, items: { type: Type.STRING } },
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

