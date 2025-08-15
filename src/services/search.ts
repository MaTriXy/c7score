import { Type, GoogleGenAI } from '@google/genai';
import { QuestionEvaluationOutput, QuestionEvaluationPairOutput } from '../lib/types';
import axios from 'axios';
import { runLLM } from './llmUtils';
import { questionEvaluationPromptHandler, questionEvaluationPromptCompareHandler, searchTopicsPromptHandler } from './prompts/handler';
import { defaultConfigOptions } from '../config/options';
import { searchPrompt } from './prompts/templates';

export class Search {
    private product: string;
    private client: GoogleGenAI;
    private llmConfig: Record<string, number>;
    private prompts?: Record<string, string>;

    constructor(
        product: string,
        client: GoogleGenAI,
        llmConfig: Record<string, number> = defaultConfigOptions.llm,
        prompts?: Record<string, string>) {
        this.product = product;
        this.client = client;
        this.llmConfig = llmConfig;
        this.prompts = prompts;
    }

    /**
     * Generates 15 questions about a product one might ask an AI coding assistant.
     * The search prompt is not customizable by user.
     * @returns The 15 questions as a string
     */
    async googleSearch(): Promise<string> {
        const prompt = searchPrompt.replace("{{product}}", this.product);
        const searchTool = { googleSearch: {} };

        const defaultConfig: object = {
            tools: [searchTool],
            ...{
                temperature: 1.0,
                topP: 0.95,
                topK: 64
            }
        }
        const response = await runLLM(prompt, defaultConfig, this.client);
        if (response == undefined) {
            throw new Error("Response is undefined");
        } else {
            return response;
        }
    }

    /**
     * Generates 5 search topics for each question.
     * @param questions - The questions to generate search topics for
     * @returns 75 search topics
     */
    async generateSearchTopics(questions: string): Promise<string[][]> {
        const prompt = searchTopicsPromptHandler(this.product, questions, this.prompts?.searchTopics);

        const config: object = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    topics: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                },
                required: ["topics"],
            },
            ...this.llmConfig
        }
        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.topics == undefined) {
            throw new Error("Topics are undefined");
        } else {
            return jsonResponse.topics;
        }
    }

    /**
     * Fetches 1 context/code snippet per topic for the library from Context7.
     * @param topics - The search topics. 15 questions, 5 topics per question.
     * @param library - The library to fetch the context for
     * @param headerConfig - The header config to use for the Context7 API
     * @returns 75 context/code snippets
     */
    async fetchRelevantSnippets(topics: string[][], library: string, headerConfig: object): Promise<string[][]> {
        const snippet_title = "=".repeat(24) + "\nCODE SNIPPETS\n" + "=".repeat(24);
        const contexts = [];
        for (const questionTopics of topics) {
            const questionContexts = [];
            for (const topic of questionTopics) {
                let snippets = "";
                const topicUrl = encodeURIComponent(topic);
                const url = `https://context7.com/api/v1/${library}?tokens=10000&topic=${topicUrl}`;
                const response = await axios.get(url, headerConfig)

                // Take only first snippet to avoid high token count downstream
                snippets = String(response.data).replace(snippet_title, "").split("\n" + "-".repeat(40) + "\n")[0];
                questionContexts.push(snippets);
            }
            contexts.push(questionContexts);
        }
        return contexts;
    }

    /**
     * Evaluates how well the snippets answer the questions based on 5 criteria.
     * @param questions - The questions to evaluate
     * @param contexts - The context/code snippets per topic
     * @returns The average scores and explanations for each context collection
     */
    async evaluateQuestionsPair(questions: string, contexts: string[][][]): Promise<QuestionEvaluationPairOutput> {
        const prompt = questionEvaluationPromptCompareHandler(contexts, questions, this.prompts?.questionEvaluation);
        const config: object = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questionAverageScores: { type: Type.ARRAY, minItems: 2, maxItems: 2, items: { type: Type.NUMBER } },
                    questionExplanations: { type: Type.ARRAY, minItems: 2, maxItems: 2, items: { type: Type.STRING } }
                },
                required: ["questionAverageScores", "questionExplanations"],
            },
            ...this.llmConfig
        }
        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.questionAverageScores == undefined || jsonResponse.questionExplanations == undefined) {
            throw new Error("Question scores are undefined");
        } else {
            return {
                questionAverageScores: jsonResponse.questionAverageScores as number[],
                questionExplanations: jsonResponse.questionExplanations as string[]
            }
        }
    }

    /**
     * Evaluates how well the snippets answer the questions based on 5 criteria.
     * @param questions - The questions to evaluate
     * @param contexts - The context/code snippets per topic
     * @returns The average score and explanation for the context collection
     */
    async evaluateQuestions(questions: string, contexts: string[][]): Promise<QuestionEvaluationOutput> {
        const prompt = questionEvaluationPromptHandler(contexts, questions, this.prompts?.questionEvaluation);
        const config: object = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questionAverageScore: { type: Type.NUMBER },
                    questionExplanation: { type: Type.STRING }
                },
                required: ["questionAverageScore", "questionExplanation"],
            },
            ...this.llmConfig
        }

        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.questionAverageScore == undefined || jsonResponse.questionExplanation == undefined) {
            throw new Error("Question scores are undefined");
        } else {
            return {
                questionAverageScore: jsonResponse.questionAverageScore as number,
                questionExplanation: jsonResponse.questionExplanation as string
            }
        }
    }
}
