import fs from "fs/promises";
import { ProjectData } from "./types";
/**
 * Converts the scores and average score into an object.
 * @param productName - The name of the product
 * @param scores - The scores to convert
 * @param averageScore - The average score to convert
 * @returns The converted scores and average score
 */
export const convertScorestoObject = (productName: string, scores: ProjectData["scores"], averageScore: number): Record<string, ProjectData> => {
    return {
        [productName]: {
            scores: scores,
            averageScore: averageScore,
        }
    }
}

/**
 * Writes the convertScoresToObject results to a machine-readable JSON file.
 * @param input - The input to write to the file
 */
export const machineReadableReport = async (input: Record<string, ProjectData>, reportOptions: Record<string, any>, compare: boolean = false): Promise<void> => {
    if (reportOptions.folderPath) {
        const filePath = `${reportOptions.folderPath}/result${compare ? "-compare" : ""}.json`;
        let obj: Record<string, ProjectData> = {};
        try {
            const resultFile = await fs.readFile(filePath, "utf-8");
            obj = JSON.parse(resultFile);
        } catch (err) {
            console.error(err);
            obj = {};

        }
        // Assumes the data we add only has one project
        const projectName = Object.keys(input)[0];

        // Adds in or updates the project data
        obj[projectName] = input[projectName];
        await fs.writeFile(filePath, JSON.stringify(obj, null, 2));
    }
}

/**
 * Writes the full results to a human-readable text file.
 * @param library - The name of the library
 * @param fullResults - The full results to write
 * @param directory - The directory to write the file to
 */
export const humanReadableReport = async (library: string, fullResults: Record<string, any>, reportOptions: Record<string, any>, compare: boolean = false): Promise<void> => {
    const toSave = [
        "== Average Score ==",
        fullResults.averageScore,
        "== Context Scores ==",
        fullResults.questionScore,
        "== Context Avg Score ==",
        fullResults.questionAverageScore,
        "== Context Explanations ==",
        fullResults.questionExplanation,
        "== LLM Avg Score ==",
        fullResults.llmAverageScore,
        "== LLM Explanation ==",
        fullResults.llmExplanation,
        "== Formatting Avg Score ==",
        fullResults.formattingAvgScore,
        "== Project Metadata Avg Score ==",
        fullResults.metadataAvgScore,
        "== Initialization Avg Score ==",
        fullResults.initializationAvgScore,
    ]
    if (reportOptions.folderPath) {
        const directory = reportOptions.folderPath;
        await fs.writeFile(`${directory}/result${compare ? "-compare" : ""}-${library.replace(/\/\.\_/g, "-").toLowerCase()}.txt`, toSave.join("\n\n"));
    }
    if (reportOptions.console) {
        console.log(toSave.join("\n\n"));
    }
}