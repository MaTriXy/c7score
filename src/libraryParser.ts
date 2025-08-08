import { fuzzy } from "fast-fuzzy";
import fs from "fs";
import { Octokit } from "octokit";

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
 * Determines if a product has an existing questions file
 * @param newProduct - The product to identify the file for
 * @returns The file path if a match is found, null otherwise
 */
export async function identifyProductFile(newProduct: string, githubClient: Octokit): Promise<string | null> {
    try {
        const questions = await githubClient.rest.repos.getContent({
            owner: "upstash",
            repo: "ContextTrace",
            path: "benchmark-questions",
            ref: "main"
        });
        const fileScores: Record<string, number> = {};
        for (const file of Object.values(questions.data)) {
            const fileName = file.name.replace(".json", "");
            const score = fuzzy(newProduct, fileName);
            fileScores[file.name] = score;
        }

        const sortedScores = Object.entries(fileScores).sort((a, b) => b[1] - a[1]);
        const bestScore = sortedScores[0];
        if (bestScore[1] > 0.8) {
            return bestScore[0];
        }
        return null;
    } catch (error) {
        throw new Error("Unable to identify product file: " + error);
    }
}
