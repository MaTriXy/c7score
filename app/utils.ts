import axios from 'axios';
import fs from "fs/promises";
import { StaticEvaluator } from './static_eval';
import { Metrics, StaticEvaluatorOutput } from './types';
import { GoogleGenAI } from '@google/genai';
import { backOff } from 'exponential-backoff';

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
    await fs.writeFile(__dirname + `/../benchmark-questions/${product.replace("/", "-").replace(".", "-").replace("_", "-").toLowerCase()}.json`, questionJson)
        .catch((err) => {
            console.error("Error writing questions to JSON file:", err);
        });
}
/**
 * Scrapes the snippets from the Context7 API
 * @param library - The library to scrape snippets from
 * @param file - The file to read the snippets from
 * @returns The snippets
 */
export async function scrapeContext7Snippets(library: string, headerConfig: object): Promise<string> {
    const context7Url = `https://context7.com/api/v1/${library}?tokens=10000`
    const response = await axios.get(context7Url, headerConfig);
    const snippets = response.data;
    const snippetsString = String(snippets);
    if (snippetsString.split("redirected to this library: ").length > 1) {
        const getLibrary = snippetsString.split("redirected to this library: ")
        const newLibrary = getLibrary[getLibrary.length - 1].split(".", 1)[0];
        const newUrl = `https://context7.com/api/v1/${newLibrary}?tokens=10000`;
        const newResponse = await axios.get(newUrl, headerConfig);
        const finalSnippets = String(newResponse.data);
        return finalSnippets;
    } else {
        const finalSnippets = snippetsString;
        return finalSnippets;
    }
}

/**
 * Runs the LLM on a prompt. This is for evaluating context and LLM metrics.
 * @param prompt - The prompt to run the LLM on
 * @param config - The config to run the LLM on
 * @param client - The client to run the LLM on
 * @returns The response from the LLM
 */
export async function runLLM(prompt: string, config: object, client: GoogleGenAI): Promise<string> {
    const countTokensResponse = await client.models.countTokens({
        model: 'gemini-2.5-pro',
        contents: [prompt],
    });
    if (countTokensResponse.totalTokens !== undefined && countTokensResponse.totalTokens > 1048576) {
        console.error("Prompt is too long: ", countTokensResponse.totalTokens, " condensing prompt to 1048576 tokens");
        // 1 Gemini token = roughly 4 characters, using 2 to be safe
        prompt = prompt.slice(0, 1048576 * 2);
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
 * @returns The average score and explanation for each metric
 */
export async function runStaticAnalysis(snippets: string): Promise<{
    formatting: StaticEvaluatorOutput,
    projectMetadata: StaticEvaluatorOutput,
    initialization: StaticEvaluatorOutput
}> {
    const staticEvaluator = new StaticEvaluator(snippets);
    const formatting = await staticEvaluator.formatting();
    const projectMetadata = await staticEvaluator.projectMetadata();
    const initialization = await staticEvaluator.initialization();
    return { formatting, projectMetadata, initialization };
}

/**
 * Calculates the average score based on all metrics, including context and LLM metrics
 * @param scores - The scores to calculate the average score for
 * @returns The average score
 */
export async function calculateAverageScore(scores: Metrics): Promise<number> {
    const weights: Record<string, number> = {
        context: 0.8,
        llm: 0.05,
        formatting: 0.05,
        projectMetadata: 0.025,
        initialization: 0.025,
    }
    const averageScore = Object.entries(scores).reduce((total, [key, value]) => total + value * weights[key], 0);
    return averageScore;
}