import { GoogleGenAI, Type } from '@google/genai';
import { LLMScores, LLMScoresCompare } from './types';
import { runLLM } from './utils';

export class LLMEvaluator {
  private client: GoogleGenAI;
  private snippets: string;
  private snippets2?: string;

  constructor(client: GoogleGenAI, snippets: string, snippets2?: string) {
    this.client = client;
    this.snippets = snippets;
    this.snippets2 = snippets2 ?? "";
  }

  /**
   * Evaluates the quality of the snippets based on 3 criteria: unique information, clarity, and correct syntax
   * @returns The average score and explanation
   */
  async llmEvaluate(): Promise<LLMScores> {
    const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
    let prompt = `
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

    Snippets: ${this.snippets}
    `;

    const config: object = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          average_score: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
        }
      }
    }
    try {
    const response = await runLLM(prompt, config, this.client);
    const jsonResponse = JSON.parse(response ?? '');
    const average_score = jsonResponse.average_score;
      const explanation = jsonResponse.explanation;
      return { average_score, explanation };
    } catch (error) {
      console.error('Error: ', error);
      return { average_score: -1, explanation: "There was an error during LLM evaluation: " + error };
    }
  }

  /**
   * Evaluates the quality of the snippets in two different snippets
   * @param context1 - The first snippets
   * @param context2 - The second snippets
   */
  async llmEvaluateCompare(): Promise<LLMScoresCompare> {
    const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
    let prompt = `
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

    Snippets 1: ${this.snippets}
    Snippets 2: ${this.snippets2}
    `;

    const config: object = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          llm_average_score: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          llm_explanation: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
      }
    }
    try {
      const response = await runLLM(prompt, config, this.client);
      const jsonResponse = JSON.parse(response ?? '');
      const llm_average_score = jsonResponse.llm_average_score;
      const llm_explanation = jsonResponse.llm_explanation;
      return { llm_average_score, llm_explanation };
    } catch (error) {
      console.error('Error: ', error);
      return { llm_average_score: [-1], llm_explanation: ["There was an error during LLM evaluation: " + error] };
    }
  }
}

