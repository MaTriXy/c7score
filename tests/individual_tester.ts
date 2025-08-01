import fs from "fs/promises";
import { snippetEvaluation } from "../app/main";
import { GoogleGenAI } from "@google/genai";
import { config } from 'dotenv';

config();

const envConfig = {
    GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
    CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

const header_config = {
    headers: {
        "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
    }
}
const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

/**
 * Gets the top n libraries from Context7
 * @returns The top n libraries as an array of strings
 */
async function getPopLibraries(top_num: number): Promise<string[]> {
    const data = await fs.readFile("../context7_api_stats.json", "utf8");
    const jsonData = JSON.parse(data);
    const libraries = jsonData["data"];
    const librariesByPop = Object.entries(libraries).reduce((acc, [key, value]) => {
        acc[key] = Object.values(value as Record<string, number>).reduce((sum: number, curr: number) => sum + curr, 0);
        return acc;
    }, {} as Record<string, number>);
    const popLibraries = Object.fromEntries(Object.entries(librariesByPop).sort((a, b) => b[1] - a[1]));
    const topPopLibraries = Object.keys(popLibraries).slice(0, top_num);
    return topPopLibraries;
}

async function main() {

    const manualLibraries = process.env.USE_MANUAL?.toLowerCase() ?? "false";
    let libraries: string[];

    if (manualLibraries.toLowerCase() === "true") {
        console.log("🧪 Using default manual libraries...")
        libraries = [
            "/facebook/react",
            "/context7/tailwindcss",
            "/tailwindlabs/tailwindcss.com"
        ]
    } else {
        console.log("🧪Getting libraries from Context7...")
        const topPopLibraries = await getPopLibraries(5);
        libraries = topPopLibraries;
    }

    for (const library of libraries) {
        try {
            console.log(`Working on ${library}...`)
            await snippetEvaluation(library, client, header_config);

        } catch (error) {
            console.error(`${library} error: ${error}`);
        }
    }
}

if (require.main === module) {
    main();
}