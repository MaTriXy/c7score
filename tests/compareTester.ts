import { compareLibraries } from "../src/app/compareLib";

async function main() {

    console.log("🧪 Running compare tester...")
    const libraries = [
        "/tailwindlabs/tailwindcss.com",
        "/context7/tailwindcss",
    ]

    await compareLibraries(libraries[0], libraries[1], {
        report: {
            console: true,
            folderPath: `${__dirname}/../results`
        },
        weights: {
            question: 1,
            llm: 0,
            formatting: 0,
            metadata: 0,
            initialization: 0,
        },
        llm: {
            temperature: 0.0,
            topP: 0.95,
            topK: 40
        },
        prompts: {
            searchTopics: `
                    For each question about {{product}}, generate 5 topics thatshould help find the most 
                    relevant documentation and code examples.

                    Here are the questions: {{questions}}
                    `,
            questionEvaluation: `
                    You are evaluating two different documentation contexts for their quality and relevance in helping an AI 
                    coding assistant answer the following question:

                    Questions: {{questions}}

                    Contexts ({{contexts[0]}}, {{contexts[1]}}):

                    For each question, evaluate and score the context from 0-100 based on the following criteria:
                    1. Relevance to the specific question (50%)
                    2. Coverage of requested features (50%)

                    Your response should contain one list that contains two sublists for each context (4 in total), where the first sublist represents 
                    your responses for the first context and the second sublist represents your responses for the second context. 
                    Each sublist should have two sublists, where the first sublist represents the scores for each question,
                    and should have 15 elements. The second sublist represents the correspond explanations for each score,
                    and should also have 15 elements. Each context will return an average score, with a total of 2 average scores.
                    `,
            llmEvaluation: `
                    Compare the quality of two different snippet sources using the criteria. 
                    Your total score for the snippets should be between 0 and 100, 
                    where 0 is the indicates that the snippets did not meet the criteria 
                    at all, 50 is the criteria was partially met, and 100 is the 
                    criteria was fully met with no room for improvement.
                    The snippets are separated by {{snippetDelimiter}}.
                    
                    Criteria:
                    1. Unique Information (50%): Snippets contain unique information that is not already included in 
                    another snippet. There can be some overlap, but the snippets should not be identical.
                    2. Correct Syntax (50%): No snippets contain any obvious syntax errors. Snippets are formatted in such a way 
                    that you can easily isolate the code (e.g., no placeholders or ellipses). The programming language of 
                    the code snippet is correct.

                    In your response, include the average score and the explanation of the score for each snippet source.

                    Snippets 1: {{snippets[0]}}
                    Snippets 2: {{snippets[1]}}
                    `
        }
    });
}

if (require.main === module) {
    main();
}