import { fuzzy } from "fast-fuzzy";
import fs from "fs";

/**
 * Identifies the product of a library
 * @param library - The library to identify the product of
 * @returns The name of the product for the library
 */
export function identifyProduct(library: string): string {
    const cleanLibrary = library.replace(".com", "").replace(".org", "").replace("docs", "").replace(".", "-").replace("/", "-").replace("_", "-").toLowerCase();
    const prodSplit = cleanLibrary.split("/");
    const finalProduct = prodSplit[prodSplit.length - 1].trim().toLowerCase();
    return finalProduct;
}

/**
 * Determines if a product has an existing questions file
 * @param newProduct - The product to identify the file for
 * @returns The file path if a match is found, null otherwise
 */
export function identifyProductFile(newProduct: string): string | null {
    const folderName = `${__dirname}/../benchmark-questions/`;
    const files = fs.readdirSync(folderName)

    // No files in the folder
    if (files.length === 0) {
        return null;
    }

    const fileScores: Record<string, number> = {};
    for (const file of files) {
        const prodSplit = file.split("/");
        const fileName = prodSplit[prodSplit.length - 1].split(".")[0].trim().toLowerCase();
        const score = fuzzy(newProduct, fileName);
        fileScores[fileName] = score;
    }
    const sortedScores = Object.entries(fileScores).sort((a, b) => b[1] - a[1]);
    const bestScore = sortedScores[0];
    if (bestScore[1] > 0.8) {
        return folderName + bestScore[0] + ".json";
    }
    return null;
}