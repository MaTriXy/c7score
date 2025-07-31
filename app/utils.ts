import axios from 'axios';
import fs from "fs/promises";
import { StaticEvaluator } from './static_eval';
import { Metrics } from './types';

/**
 * Scrapes the snippets from the Context7 API
 * @param library - The library to scrape snippets from
 * @param file - The file to read the snippets from
 * @returns The snippets
 */
export async function scrapeContext7Snippets(library: string, file: string): Promise<string> {
    const data = await fs.readFile(file, "utf8");
    return data;
    // const context7Url = `https://context7.com/api/v1/${library}`
    // const response = await axios.get(context7Url);
    // const snippets = response.data;
    // const snippetsString = String(snippets);
    // if (snippetsString.split("redirected to this library: ").length > 1) {
    //     const getLibrary = snippetsString.split("redirected to this library: ")
    //     const newLibrary = getLibrary[getLibrary.length - 1].split(".", 1)[0];
    //     const newUrl = `https://context7.com/api/v1/${newLibrary}`;
    //     console.log("New URL:", newUrl);
    //     const newResponse = await axios.get(newUrl);
    //     const finalSnippets = String(newResponse.data);
    //     return finalSnippets;
    // } else {
    //     const finalSnippets = snippetsString;
    //     return finalSnippets;
    // }
}

/**
 * Runs all three static analysis metrics on the snippets
 * @param snippets - The snippets to run static analysis on
 * @returns The average score and explanation for each metric
 */
export async function runStaticAnalysis(snippets: string): Promise<{
    formatting_avg_score: number,
    formatting_explanation: string,
    projectMetadata_avg_score: number,
    projectMetadata_explanation: string,
    initialization_avg_score: number,
    initialization_explanation: string
}> {

    const static_evaluator = new StaticEvaluator(snippets);
    const { average_score: formatting_avg_score, explanation: formatting_explanation } = await static_evaluator.formatting();
    const { average_score: projectMetadata_avg_score, explanation: projectMetadata_explanation } = await static_evaluator.projectMetadata();
    const { average_score: initialization_avg_score, explanation: initialization_explanation } = await static_evaluator.initialization();
    return { formatting_avg_score, formatting_explanation, projectMetadata_avg_score, projectMetadata_explanation, initialization_avg_score, initialization_explanation };
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
    console.log("Scores:", scores);
    const averageScore = Object.entries(scores).reduce((total, [key, value]) => total + value * weights[key], 0);
    return averageScore;
}