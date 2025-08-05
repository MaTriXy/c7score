import { GoogleGenAI, Type } from '@google/genai';
import { LLMScores } from './types';
import { runLLM } from './utils';

export class LLMEvaluator {
  private client: GoogleGenAI;

  constructor(client: GoogleGenAI) {
    this.client = client;
  }

  /**
   * Evaluates the quality of the snippets based on 3 criteria: unique information, clarity, and correct syntax
   * @returns The average score(s) and explanation(s) for the snippet collection(s)
   */
  async llmEvaluate(snippets: string[]): Promise<LLMScores> {
    let snippetsCombined = "";
    if (snippets.length === 2) {
      snippetsCombined = "Snippet Collection 1: " + snippets[0] + "\n" + "-".repeat(40) + "\n" + "Snippet Collection 2: " + snippets[1];
    } else {
      snippetsCombined = "Snippet Collection: " + snippets[0];
    }
    const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
    let prompt = `
    You are an expert code quality analyst. Your task 
    is to rate a collection of code snippets based on 
    the provided criteria and input. The snippets to be 
    evaluated are separated by ${snippetDelimiter} and 
    their code blocks are enclosed in \`\`\`.
    
    Evaluation Criteria:

    Rate the snippets on a scale of 0-100 for each of the 
    following criteria. A score of 50 indicates that the 
    criteria was partially met across the snippets, while 
    100 indicates it was fully met with no room for improvement.

    1. **Unique Information (Weight: 30%)**: Snippets contain unique information 
    and are not redundant. Minor overlap is acceptable, but identical 
    snippets are penalized.
    2. **Clarity (Weight: 30%)**: Snippets are not confusingly worded. Titles 
    and descriptions are sensible and accurate. All text, including 
    in code, is in English. There are no significant grammatical 
    or spelling errors.
    3. **Correct Syntax (Weight: 40%)**: Snippets are free from obvious 
    syntax errors. The code is well-formatted and does not contain placeholders 
    or ellipses (e.g., "..."). The programming language is correct for the 
    snippet's purpose.

    Output Format:

    For each collection of snippets, provide the average score and a brief 
    explanation of the average score.

    ${snippetsCombined}
    `;

    const config: object = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          llmAverageScores: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          llmExplanations: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
      }
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