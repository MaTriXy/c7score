import fs from "fs/promises";
import { ProjectData } from "./types";
import { Octokit } from "octokit";
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
export const machineReadableReport = async (input: Record<string, ProjectData>, githubClient: Octokit): Promise<void> => {
    let obj: Record<string, ProjectData> = {};
    let shaCode: string = "";
    try {
        const res = await githubClient.rest.repos.getContent({
            owner: "upstash",
            repo: "ContextTrace",
            path: `result.json`,
            ref: "main",
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const contentFile = res.data
        // Ensure that the contentFile is not a directory and content exists
        if (!Array.isArray(contentFile) && contentFile.type === "file" && contentFile.content) {
            shaCode = contentFile.sha;
            const decodedContent = Buffer.from(contentFile.content, 'base64').toString('utf-8');
            obj = JSON.parse(decodedContent);
        } else {
            throw new Error("Content file is a directory or does not contain content.");
        }

    } catch (error) {
        console.error("Creating new result.json file" + error);
        obj = {};
    }

    // Assumes the data we add only has one project
    const projectName = Object.keys(input)[0];

    // Adds in or updates the project data
    obj[projectName] = input[projectName];
    const projectJSON = JSON.stringify(obj, null, 2);
    await githubClient.rest.repos.createOrUpdateFileContents({
        owner: "upstash",
        repo: "ContextTrace",
        path: `result.json`,
        message: `Add machine-readable report for ${projectName}`,
        content: Buffer.from(projectJSON).toString('base64'),
        branch: "main",
        sha: shaCode
    });
}

/**
 * Writes the full results to a human-readable text file.
 * @param library - The name of the library
 * @param fullResults - The full results to write
 * @param directory - The directory to write the file to
 */
export const humanReadableReport = async (library: string, fullResults: Record<string, any>, reportOptions: Record<string, any>): Promise<void> => {
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
        await fs.writeFile(`${directory}/result-${library.replace(/\//g, "-").replace(".", "-").replace("_", "-").toLowerCase()}.txt`, toSave.join("\n\n"));
    }
    if (reportOptions.console) {
        console.log(toSave.join("\n\n"));
    }
}