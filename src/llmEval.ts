import { GoogleGenAI, Type } from '@google/genai';
import { LLMScores, LLMScoresCompare } from './types';
import { runLLM } from './utils';

export class LLMEvaluator {
    private client: GoogleGenAI;
    private llmConfig: Record<string, any>;

    constructor(client: GoogleGenAI, llmConfig: Record<string, any>) {
        this.client = client;
        this.llmConfig = llmConfig;
    }

    /**
     * Evaluates the quality of the snippets based on 3 criteria: unique information, clarity, and correct syntax
     * @returns The average score and explanation for the snippet collection
     */
    async llmEvaluate(snippets: string): Promise<LLMScores> {
        const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
        const prompt = `
        Rate the quality of the snippets using the criteria. 
        Your total score for the snippets should be between 0 and 100, 
        where 0 is the indicates that the snippets did not meet the criteria 
        at all, 50 is the criteria was partially met, and 100 is the 
        criteria was fully met with no room for improvement.
        The snippets are separated by ${snippetDelimiter} 
        and the code blocks are enclosed in \`\`\`.
        Your scores should represent a ratio of how many
        snippets meet the criterion out of the total number of snippets.
        
        Criteria:
        1. Unique Information (30%): Snippets contain unique information that is not already included in 
        another snippet. There can be some overlap, but the snippets should not be identical.
        2. Clarity (30%): There are no snippets that are confusingly worded or unclear. This could be grammatical 
        or spelling errors. Titles and descriptions are sensible (e.g., the description shouldn't be about requests 
        when the code is about visualizing data) and all the text, even in the code snippets, are in English.
        3. Correct Syntax (40%): No snippets contain any obvious syntax errors. Snippets are formatted in such a way 
        that you can easily isolate the code (e.g., no placeholders or ellipses). The programming language of 
        the code snippet is correct.

        In your response, include the average score and the explanation for each score.

        Snippets: ${snippets}
        `;

        const config: object = {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        llmAverageScore: { type: Type.NUMBER },
                        llmExplanation: { type: Type.STRING },
                    },
                    required: ["llmAverageScore", "llmExplanation"],
                },
            ...this.llmConfig
        }
        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.llmAverageScore == undefined || jsonResponse.llmExplanation == undefined) {
            throw new Error("LLM scores are undefined");
        } else {
            const llmAverageScore = jsonResponse.llmAverageScore;
            const llmExplanation = jsonResponse.llmExplanation;
            return { llmAverageScore, llmExplanation };
        }
    }

    /**
     * Compares the quality of two different snippet sources using the criteria
     * @returns The average scores and explanations for the snippet collections
     */
    async llmEvaluateCompare(snippets: string[]): Promise<LLMScoresCompare> {
        const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
        const prompt = `
        Compare the quality of two different snippet sources using the criteria. 
        Your total score for the snippets should be between 0 and 100, 
        where 0 is the indicates that the snippets did not meet the criteria 
        at all, 50 is the criteria was partially met, and 100 is the 
        criteria was fully met with no room for improvement.
        The snippets are separated by ${snippetDelimiter} 
        and the code blocks are enclosed in \`\`\`.
        Your scores should represent a ratio of how many
        snippets meet the criterion out of the total number of snippets.
        
        Criteria:
        1. Unique Information (30%): Snippets contain unique information that is not already included in 
        another snippet. There can be some overlap, but the snippets should not be identical.
        2. Clarity (30%): There are no snippets that are confusingly worded or unclear. This could be grammatical 
        or spelling errors. Titles and descriptions are sensible (e.g., the description shouldn't be about requests 
        when the code is about visualizing data) and all the text, even in the code snippets, are in English.
        3. Correct Syntax (40%): No snippets contain any obvious syntax errors. Snippets are formatted in such a way 
        that you can easily isolate the code (e.g., no placeholders or ellipses). The programming language of 
        the code snippet is correct.

        In your response, include the average score and the explanation of the score for each snippet source.

        Snippets 1: ${snippets[0]}
        Snippets 2: ${snippets[1]}
        `;

        const config: object = {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object',
                properties: {
                    llmAverageScores: { type: Type.ARRAY, minItems: snippets.length, items: { type: Type.NUMBER } },
                    llmExplanations: { type: Type.ARRAY, minItems: snippets.length, items: { type: Type.STRING } },
                },
                required: ["llmAverageScores", "llmExplanations"],
            },
            ...this.llmConfig
        }
        const response = await runLLM(prompt, config, this.client);
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.llmAverageScores == undefined || jsonResponse.llmExplanations == undefined) {
            throw new Error("LLM scores are undefined");
        } else {
            const llmAverageScores = jsonResponse.llmAverageScores;
            const llmExplanations = jsonResponse.llmExplanations;
            return { llmAverageScores, llmExplanations };
        }
    }
}

