import fs from "fs/promises";
import { ProjectData } from "../lib/types";
import { defaultConfigOptions } from '../config/options';

/**
 * Converts the scores and average score into an object
 * @param productName - The name of the product
 * @param scores - The scores to convert
 * @param averageScore - The average score to convert
 * @returns The converted scores and average score
 */
export const convertScorestoObject = (
    productName: string,
    scores: ProjectData["scores"],
    averageScore: number,
): Record<string, any> => {
    return {
        [productName]: {
            scores: scores,
            averageScore: averageScore,
        }
    }
}

/**
 * Writes the convertScoresToObject results to a machine-readable JSON file
 * @param input - The input to write to the file
 * @param reportOptions - The options for the report, specifically the folder path
 * @param compare - Whether the report is for a comparison or individual library
 */
export const machineReadableReport = async (
    input: Record<string, ProjectData>,
    reportOptions: Record<string, any> = defaultConfigOptions.report,
    compare: boolean = false): Promise<void> => {
    if (reportOptions.folderPath) {
        const filePath = `${reportOptions.folderPath}/result${compare ? "-compare" : ""}.json`;
        let obj: Record<string, ProjectData> = {};
        try {
            const resultFile = await fs.readFile(filePath, "utf-8");
            obj = JSON.parse(resultFile);
        } catch (err) {
            if (err instanceof Error && err.message.includes("ENOENT")) {
                obj = {}
            } else {
                throw err;
            }
        }
        // Assumes the data we add only has one project
        const projectName = Object.keys(input)[0];

        // Adds in or updates the project data
        obj[projectName] = input[projectName];
        await fs.writeFile(filePath, JSON.stringify(obj, null, 2));
    }
}
