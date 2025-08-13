import { Type, GoogleGenAI } from '@google/genai';
import { QuestionEvaluationOutput, QuestionEvaluationPairOutput } from './types';
import axios from 'axios';
import { runLLM } from './utils';
import { questionEvaluationPrompt, questionEvaluationPromptCompare, searchTopicsPrompt } from './prompts';

export class Search {
    private product: string;
    private client: GoogleGenAI;
    private llmConfig: Record<string, any>;
    private prompts?: Record<string, any>;

    constructor(product: string, client: GoogleGenAI, llmConfig: Record<string, any>, prompts?: Record<string, any>) {
        this.product = product;
        this.client = client;
        this.llmConfig = llmConfig;
        this.prompts = prompts;
    }

    /**
     * Generates 15 questions about a product one might ask an AI coding assistant.
     * @returns The 15 questions as a string
     */
    async googleSearch(): Promise<string> {
        const prompt =  `
            Generate 15 questions, 10 of which should be common and practical 
            questions that developers frequently ask when using the product ${this.product}. 
            These should represent real-world use cases and coding challenges. 
        
            Add 5 more questions that might not be very common but relevant to edge cases and 
            less common use cases. Format each question on a new line, numbered 1-15. 
            Questions should be specific and actionable, the kind that a developer would ask an 
            AI coding assistant.
        
            Focus on diverse topics like:
            - Component building (cards, navigation, forms, modals)
            - Responsive design patterns
            - Animation and transitions
            - Dark mode implementation
            - Custom styling and configuration
            - Performance optimization
            - Common UI patterns
        
            Example questions:
            1. "Show me how to build a card component with shadow, hover effects, and truncated text in ${this.product}"
            2. "How to create a responsive navigation bar with dropdown menus in ${this.product}"
        
            Do not include any headers in your response, only the list of questions. You may search 
            Google for the questions.
            `;
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
        const prompt = searchTopicsPrompt(this.product, questions, this.prompts?.searchTopics);

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
     * @param topics - The search topics
     * @param library - The library to fetch the context for
     * @param headerConfig - The header config to use for the Context7 API
     * @returns 75 context/code snippets
     */
    async fetchRelevantSnippets(topics: string[][], library: string, headerConfig: object): Promise<string[][]> {
        const snippet_title = "=".repeat(24) + "\nCODE SNIPPETS\n" + "=".repeat(24);
        const contexts = []; // 15 x 5 = 75 snippets
        for (const questionTopics of topics) {  // total of 15 questions
            const questionContexts = [];  // 5 snippets per question
            for (const topic of questionTopics) {  // total of 5 topics per question
                let snippets = "";
                const topicUrl = encodeURIComponent(topic);
                const url = `https://context7.com/api/v1/${library}?tokens=10000&topic=${topicUrl}`;
                const response = await axios.get(url, headerConfig)
                snippets = String(response.data).replace(snippet_title, "").split("\n" + "-".repeat(40) + "\n")[0]; // Take first snippet
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
        const prompt = questionEvaluationPromptCompare(contexts, questions, this.prompts?.questionEvaluation);
        const config: object = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questionAverageScores: { type: Type.ARRAY, minItems: contexts.length, items: { type: Type.NUMBER } },
                    questionExplanations: { type: Type.ARRAY, minItems: contexts.length, items: { type: Type.STRING } }
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
        const prompt = questionEvaluationPrompt(contexts, questions, this.prompts?.questionEvaluation);
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