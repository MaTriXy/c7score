import axios, { AxiosError } from 'axios';
import fs from "fs/promises";
import { StaticEvaluator } from './staticEval';
import { Metrics, StaticEvaluatorOutput } from './types';
import { GoogleGenAI } from '@google/genai';
import { backOff } from 'exponential-backoff';

/**
 * Checks if the library has any redirects
 * @param library - The library to check
 * @returns The redirect if it exists, otherwise an empty string
 */
export async function checkRedirects(library: string): Promise<string> {
    try {
        const context7Libraries = `https://context7.com/api/v1/${library}?tokens=10000`;
        await axios.get(context7Libraries);
        return library;
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
            const redirectKeyword = `Library ${library} has been redirected to this library: `
            const errorMessage = error.response.data;
            if (errorMessage.includes(redirectKeyword)) {
                console.log("Redirect found for", library);
                const newLibrary = errorMessage.split(redirectKeyword)[1].split(".").slice(0, -1).join(".").trim();
                return newLibrary;
            }
        }
        throw error
    }
}

/**
 * Creates a JSON file for the questions
 * @param product - The product to create the file for
 * @param questions - The questions to create the file for
 */
export async function createQuestionFile(product: string, questions: string): Promise<void> {
    const isolatedQuestions: Record<string, string> = {};
    for (const num of Array.from(Array(15).keys())) {
        const isolatedQ = questions.split("\n")[num]
        const qNum = String(num + 1) + "."
        const cleanedQ = isolatedQ.substring(isolatedQ.indexOf(qNum) + qNum.length + 1);
        isolatedQuestions["Question " + String(num + 1)] = cleanedQ;
    }
    const questionJson = JSON.stringify(isolatedQuestions, null, 2);
    fs.writeFile(__dirname + `/../benchmark-questions/${product.replace("/", "-").replace(".", "-").replace("_", "-").toLowerCase()}.json`, questionJson)
}

/**
 * Scrapes snippets from the Context7 API.
 * @param library - The library to scrape snippets from
 * @param headerConfig - The header config to use for the Context7 API
 * @returns The scraped snippets
 */
export async function scrapeContext7Snippets(library: string, headerConfig: object): Promise<string> {
    const context7Url = `https://context7.com/api/v1${library}?tokens=10000`
    const response = await axios.get(context7Url, headerConfig);
    const snippet_title = "=".repeat(24) + "\nCODE SNIPPETS\n" + "=".repeat(24);
    const snippets = String(response.data).replace(snippet_title, "");
    return snippets;
}

/**
 * Runs the LLM on a prompt. This is for evaluating context and LLM metrics.
 * @param prompt - The prompt to run the LLM on
 * @param config - The config to use. Specifies formatting and tool calling.
 * @param client - The client to use for the LLM evaluation
 * @returns The response from the LLM
 */
export async function runLLM(prompt: string, config: Record<string, any>, client: GoogleGenAI): Promise<string> {
    const countTokensResponse = await client.models.countTokens({
        model: 'gemini-2.5-pro',
        contents: [prompt],
    });
    if (countTokensResponse.totalTokens !== undefined && countTokensResponse.totalTokens > 1048576) {
        console.error("Prompt is too long: ", countTokensResponse.totalTokens, " condensing prompt to 1048576 tokens");
        // 1 Gemini token = roughly 4 characters, using 3 to not go over limit
        prompt = prompt.slice(0, 1048576 * 3);
    }
    const generate = async (): Promise<string> => {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [prompt],
            config: config
        });

        if (response.text === undefined) {
            throw new Error("Response is undefined");
        }
        return response.text;
    }
    try {
        const retryResponse = await backOff(() => generate(), {
            numOfAttempts: 5,
            delayFirstAttempt: true,
        });
        return retryResponse;
    } catch (error) {
        throw new Error("Error in LLM call (context or llm evaluation): " + error);
    }
}

/**
 * Runs all three static analysis metrics on the snippets
 * @param snippets - The snippets to run static analysis on
 * @returns The average score for each metric
 */
export function runStaticAnalysis(snippets: string): {
    formatting: StaticEvaluatorOutput,
    projectMetadata: StaticEvaluatorOutput,
    initialization: StaticEvaluatorOutput
} {
    const staticEvaluator = new StaticEvaluator(snippets);
    const formatting = staticEvaluator.formatting();
    const projectMetadata = staticEvaluator.projectMetadata();
    const initialization = staticEvaluator.initialization();
    return { formatting, projectMetadata, initialization };
}

/**
 * Calculates the average score based on context, static analysis, and LLM metrics.
 * @param scores - The scores used to calculate the weighted average
 * @param weights - The weights to use for the average score (optional)
 * @returns The weighted average score
 */
export function calculateAverageScore(scores: Metrics, weights: Record<string, number>): number {
    const averageScore = Object.entries(scores).reduce((total, [key, value]) => total + value * weights[key], 0);
    return averageScore;
}