import fs from "fs/promises";

interface ProjectData {
    scores: {
        context: number;
        llm: number;
        formatting: number;
        projectMetadata: number;
        initialization: number;
    };
    averageScore: number;
}

export const convertScorestoObject = (productName: string, scores: ProjectData["scores"], averageScore: number): Record<string, ProjectData> => {
    return {
        [productName]: {
            scores: scores,
            averageScore: averageScore,
        }
    }
}

export const writeToAllResults = async (input: Record<string, ProjectData>): Promise<void> => {
    const filePath = `${__dirname}/../out/result.json`;
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
    console.log("projectName", projectName);

    // Adds in or updates the project data
    obj[projectName] = input[projectName];

    await fs.writeFile(filePath, JSON.stringify(obj, null, 2));
}


export const writeToProjectResults = async (library: string, fullResults: Record<string, any>, directory: string): Promise<void> => {
  // Save answers to txt
    const toSave = [
        "== Average Score ==",
        fullResults.averageScore,
        "== Context Scores ==",
        fullResults.contextScores,
        "== Context Avg Score ==",
        fullResults.contextAverageScore,
        "== Context Explanations ==",
        fullResults.contextExplanation,
        "== LLM Avg Score ==",
        fullResults.llmAverageScore,
        "== LLM Explanation ==",
        fullResults.llmExplanation,
        "== Formatting Avg Score ==",
        fullResults.formattingAvgScore,
        "== Project Metadata Avg Score ==",
        fullResults.projectMetadataAvgScore,
        "== Initialization Avg Score ==",
        fullResults.initializationAvgScore,
        "== Errors ==",
        fullResults.errors,
    ]
  await fs.writeFile(`${__dirname}/../${directory}/result-${library.replace(/\//g, "-").replace(".", "-").replace("_", "-").toLowerCase()}.txt`, toSave.join("\n\n"));
}