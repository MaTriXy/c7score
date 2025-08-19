import { Octokit } from 'octokit';
import { fuzzy } from 'fast-fuzzy';

/**
 * Determines if a product has an existing questions file in the c7score repo
 * @param newProduct - The product to identify the file for
 * @returns The file path if a match is found, null otherwise
 */
export async function identifyProductFile(newProduct: string, githubClient: Octokit): Promise<string | null> {
    try {
        const questions = await githubClient.rest.repos.getContent({
            owner: "upstash",
            repo: "c7score",
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

/**
 * Gets the questions file from the c7score repo
 * @param filePath - The path to the questions file
 * @param githubClient - The GitHub client
 * @returns The questions file
 */
export const getQuestionsFile = async (filePath: string, githubClient: Octokit): Promise<string> => {
    const res = await githubClient.rest.repos.getContent({
        owner: "upstash",
        repo: "c7score",
        path: `benchmark-questions/${filePath}`,
        ref: "main",
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    const contentFile = res.data
    if (!Array.isArray(contentFile) && contentFile.type === "file" && contentFile.content) {
        return Buffer.from(contentFile.content, 'base64').toString('utf-8');
    } else {
        throw new Error("Content file is a directory or does not contain content.");
    }
}

/**
 * Creates a JSON file for the questions in the c7score repo
 * @param product - The product to create the file for
 * @param questions - The questions to create the file for
 */
export async function createQuestionFile(product: string, questions: string, githubClient: Octokit): Promise<void> {
    const isolatedQuestions: Record<string, string> = {};
    for (const num of Array.from(Array(15).keys())) {
        const isolatedQ = questions.split("\n")[num]
        const qNum = String(num + 1) + "."
        const cleanedQ = isolatedQ.substring(isolatedQ.indexOf(qNum) + qNum.length + 1);
        isolatedQuestions["Question " + String(num + 1)] = cleanedQ;
    }
    const questionJson = JSON.stringify(isolatedQuestions, null, 2);
    await githubClient.rest.repos.createOrUpdateFileContents({
        owner: "upstash",
        repo: "c7score",
        path: `benchmark-questions/${product}.json`,
        message: `Add questions file for ${product}`,
        content: Buffer.from(questionJson).toString('base64'),
        branch: "main"
    });
}
