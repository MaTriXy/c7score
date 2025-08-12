import { getScore } from "../src/getScore";
import fs from "fs/promises";


/**
 * Gets the top n libraries from Context7
 * @returns The top n libraries as an array of strings
 */
export async function getPopLibraries(top_num: number): Promise<string[]> {
    const data = await fs.readFile(`${__dirname}/../context7_api_stats.json`, "utf8");
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
            "shadcn-ui/ui",
            "langchain-ai/langgraph",
        ]
    } else {
        console.log("🧪Getting libraries from Context7...")
        const topPopLibraries = await getPopLibraries(5)
        libraries = topPopLibraries;
    }

    for (const library of libraries) {
        try {
            console.log(`Working on ${library}...`)
            await getScore(library, 
                { 
                report: {
                    console: true,
                    folderPath: `${__dirname}/../results`
                },
                weights: {
                question: 0.8,
                llm: 0.05,
                formatting: 0.05,
                metadata: 0.025,
                initialization: 0.025,
                },
                llm: {
                    temperature: 0.9,
                    topP: 0.85,
                    topK: 45
                }
        });

        } catch (error) {
            console.error(`${library} error: ${error}`);
        }
    }
}

if (require.main === module) {
    main();
}