import fs from "fs/promises";
import { contextEvaluation } from "../main";
import { GoogleGenAI } from "@google/genai";
import { config } from 'dotenv';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

/**
 * Gets the top 100 libraries from Context7
 * @returns The top 100 libraries as an array of strings
 */
async function getPopLibraries(): Promise<string[]> {
    const data = await fs.readFile("app/context7_api_stats.json", "utf8");
    const jsonData = JSON.parse(data);
    const libraries = jsonData["data"];
    const librariesByPop = Object.entries(libraries).reduce((acc, [key, value]) => {
        acc[key] = Object.values(value as Record<string, number>).reduce((sum: number, curr: number) => sum + curr, 0);
        return acc;
    }, {} as Record<string, number>);
    const popLibraries = Object.fromEntries(Object.entries(librariesByPop).sort((a, b) => b[1] - a[1]));
    const topPopLibraries = Object.keys(popLibraries).slice(0, 100);
    return topPopLibraries;
}

async function main() {

    // Define row types
    interface LibraryScoreRows {
        "library": string;
        "Overall Avg Score": number;
        "Context Scores Breakdown": number[];
        "Context Avg Score": number;
        "Context Explanations": string;
        "LLM Avg Score": number;
        "LLM Explanation": string;
        "Formatting Avg Score": number;
        "Formatting Explanation": string;
        "Project Metadata Avg Score": number;
        "Project Metadata Explanation": string;
        "Initialization Avg Score": number;
        "Initialization Explanation": string;
        "Other Messages": string;
    }

    const manualLibraries = process.env.USE_MANUAL?.toLowerCase() ?? "false";
    let libraries: string[];

    if (manualLibraries.toLowerCase() === "true") {
        console.log("Using default manual libraries...")
        libraries = [
            "/context7/tailwindcss",
            "/tailwindlabs/tailwindcss.com"
        ]
    } else {
        console.log("Getting libraries from Context7...")
        const topPopLibraries = await getPopLibraries();
        libraries = topPopLibraries;
    }

    const libraryScoreRows: LibraryScoreRows[] = [];

    for (const library of libraries) {
        try {
            console.log(`Working on ${library}...`)
            const {
                averageScore,
                context_scores,
                context_avg_score,
                context_explanations,
                llm_avg_score,
                llm_explanation,
                formatting_avg_score,
                formatting_explanation,
                projectMetadata_avg_score,
                projectMetadata_explanation,
                initialization_avg_score,
                initialization_explanation,
                otherMessages
            } = await contextEvaluation(library, client);

            // Create row
            const row: LibraryScoreRows = {
                "library": library,
                "Overall Avg Score": averageScore,
                "Context Scores Breakdown": context_scores,
                "Context Avg Score": context_avg_score,
                "Context Explanations": context_explanations.join("\n\n"),
                "LLM Avg Score": llm_avg_score,
                "LLM Explanation": llm_explanation,
                "Formatting Avg Score": formatting_avg_score,
                "Formatting Explanation": formatting_explanation,
                "Project Metadata Avg Score": projectMetadata_avg_score,
                "Project Metadata Explanation": projectMetadata_explanation,
                "Initialization Avg Score": initialization_avg_score,
                "Initialization Explanation": initialization_explanation,
                "Other Messages": otherMessages.join("\n\n"),
            }
            libraryScoreRows.push(row);
        } catch (error) {
            console.error(`${library} error: ${error}`);
        }
    }
    // Save to CSV
    const csv = libraryScoreRows.map(row => Object.values(row).join(",")).join("\n");
    await fs.writeFile("app/library_scores.csv", csv);
}

if (require.main === module) {
    main();
}