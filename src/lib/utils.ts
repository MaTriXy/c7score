import { TextEvaluator } from './textEval';
import { Metrics, TextEvaluatorOutput } from './types';

import { defaultConfigOptions } from '../config/options';

/**
 * Identifies the product of a library
 * @param library - The library to identify the product of
 * @returns The name of the product for the library
 */
export function identifyProduct(library: string): string {
    const libraryExtensionsRemoved = library.replace(/(\.com|\.org|docs)/g, "")
    const libraryNormalized = libraryExtensionsRemoved.replace(/(\.|\/\_)/g, "-").toLowerCase();
    const prodSplit = libraryNormalized.split("/");
    const finalProduct = prodSplit[prodSplit.length - 1].trim();
    return finalProduct;
}

/**
 * Runs all three text analysis metrics on the snippets
 * @param snippets - The snippets to run text analysis on
 * @returns The average scores for each metric
 */
export function runTextAnalysis(snippets: string): {
    formatting: TextEvaluatorOutput,
    metadata: TextEvaluatorOutput,
    initialization: TextEvaluatorOutput
} {
    const textEvaluator = new TextEvaluator(snippets);
    const formatting = textEvaluator.formatting();
    const metadata = textEvaluator.metadata();
    const initialization = textEvaluator.initialization();
    return { formatting, metadata, initialization };
}

/**
 * Calculates the final average score based on context, text analysis, and LLM metrics
 * @param scores - The scores used to calculate the weighted average
 * @param weights - The weights to use for the weighted average
 * @returns The weighted average score
 */
export function calculateAverageScore(scores: Metrics, weights: Record<string, number> = defaultConfigOptions.weights): number {
    const averageScore = Object.entries(scores).reduce((total, [key, value]) => total + value * weights[key], 0);
    return averageScore;
}
