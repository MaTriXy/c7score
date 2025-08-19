import axios from "axios";
import { getScore } from "../src/app/getScore";

/**
 * Gets the top n libraries from Context7
 * @returns The top n libraries as an array of strings
 */
export async function getPopLibraries(top_num: number): Promise<string[]> {
    const response = await axios.get("https://context7.com/api/stats", {timeout: 30000});
    const jsonData = response.data as Record<string, any>;
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
                        metadata: 0.05,
                        initialization: 0.05,
                    },
                    llm: {
                        temperature: 0.9,
                        topP: 0.85,
                        topK: 45
                    },
                    prompts: {
                        searchTopics: `
                                For each question about {{product}}, generate 5 topics thatshould help find the most 
                                relevant documentation and code examples.

                                Here are the questions: {{questions}}
                                `,
                        questionEvaluation: `
                                You are evaluating documentation context for its quality and relevance in helping an AI 
                                coding assistant answer the following question:

                                Questions: {{questions}}

                                Context: {{contexts}}

                                For each question, evaluate and score the context from 0-100 based on the following criteria:
                                1. Relevance to the specific question (50%)
                                2. Coverage of requested features (50%)

                                Your response should contain a list of scores, one average score, and one explanation for each score.
                                `,
                        llmEvaluation: `
                                Rate the quality of the snippets using the criteria. 
                                Your total score for the snippets should be between 0 and 100, 
                                where 0 is the indicates that the snippets did not meet the criteria 
                                at all, 50 is the criteria was partially met, and 100 is the 
                                criteria was fully met with no room for improvement.
                                The snippets are separated by {{snippetDelimiter}} 
                                and the code blocks are enclosed in \`\`\`.
                                Your scores should represent a ratio of how many
                                snippets meet the criterion out of the total number of snippets.
                                
                                Criteria:
                                1. Unique Information (50%): Snippets contain unique information that is not already included in 
                                another snippet. There can be some overlap, but the snippets should not be identical.
                                2. Correct Syntax (50%): No snippets contain any obvious syntax errors. Snippets are formatted in such a way 
                                that you can easily isolate the code (e.g., no placeholders or ellipses). The programming language of 
                                the code snippet is correct.

                                In your response, include the average score and the explanation for each score.

                                Snippets: {{snippets}}
                                `
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
