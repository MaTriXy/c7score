import { getPopLibraries, checkRedirects } from "../app/utils";
import { snippetEvaluation } from "../app/main";
import { GoogleGenAI } from "@google/genai";
import { config } from 'dotenv';

config();

const envConfig = {
    GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
    CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

const headerConfig = {
    headers: {
        "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
    }
}
const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

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
        const topPopLibraries = await getPopLibraries(5)
        libraries = topPopLibraries;
    }

    for (const library of libraries) {
        try {
            console.log(`Working on ${library}...`)
            await snippetEvaluation([library], client, headerConfig);

        } catch (error) {
            console.error(`${library} error: ${error}`);
        }
    }
}

if (require.main === module) {
    main();
}