import { getScore } from "../src/app/getScore.ts";
import { fileURLToPath } from "url";

async function main() {

    let libraries: string[];

    libraries = [
        "shadcn-ui/ui",
        "langchain-ai/langgraph",
    ]

    for (const library of libraries) {
        try {
            console.log(`Working on ${library}...`)
            await getScore(library,
                {
                    report: {
                        console: true
                    }
                });

        } catch (error) {
            console.error(`${library} error: ${error}`);
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    void main();
}

