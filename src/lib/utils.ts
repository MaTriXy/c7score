import { TextEvaluator } from './textEval';
import { Metrics, Weights } from './types';
import { fuzzy } from 'fast-fuzzy';
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
 * Checks if the products are the same
 * @param prods - The products to check
 * @returns If the products are the same, returns the first product, otherwise throws an error
 */
export function checkSameProduct(prods: string[]): string {
    const prod1 = prods[0];
    const prod2 = prods[1];
    const matchScore = fuzzy(prod1, prod2);
    if (matchScore < 0.8) {
        throw new Error(`${prods[0]} and ${prods[1]} are not the same product`);
    }
    return prod1
}

/**
 * Runs all three text analysis metrics on the snippets
 * @param snippets - The snippets to run text analysis on
 * @returns The average scores for each metric
 */
export function runTextAnalysis(snippets: string): {
    formatting: number,
    metadata: number,
    initialization: number
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
 * @returns the average score
 */
export function calculateAverageScore(scores: Metrics, weights: Weights = defaultConfigOptions.weights): number {
    const scoresKeys = Object.keys(scores);
    const weightsKeys = Object.keys(weights);

    // Check that the weights sum to 1
    const EPS = 0.000001;
    const weightsSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightsSum - 1) > EPS) {
        throw new Error("Weights must sum to 1");
    }

    // Check that the weights and scores have the same keys
    if (weightsKeys.length !== scoresKeys.length || !scoresKeys.every(key => weightsKeys.includes(key))) {
        throw new Error("Weights and scores have different number of keys or keys are not the same");
    }

    // Calculate the average score (weighted)
    const averageScore = scoresKeys.reduce((total, key) => {
        const score = scores[key as keyof Metrics];
        const weight = weights[key as keyof Weights];
        return total + score * weight;
    }, 0);
    return averageScore;
}
