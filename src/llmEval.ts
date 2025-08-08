import { GoogleGenAI, Type } from '@google/genai';
import { LLMScores } from './types';
import { runLLM } from './utils';
import { llmEvaluationComparePrompt, llmEvaluationPrompt } from './prompts';

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
    const snippetDelimiter = "\n" + "-".repeat(40) + "\n";
    let prompt = "";
    if (snippets.length === 2) {
      prompt = llmEvaluationComparePrompt(snippets[0], snippets[1], snippetDelimiter);
    } else {
      prompt = llmEvaluationPrompt(snippets[0], snippetDelimiter);
    }
    const config: object = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          llmAverageScores: { type: Type.ARRAY, minItems: snippets.length, items: { type: Type.NUMBER } },
          llmExplanations: { type: Type.ARRAY, minItems: snippets.length, items: { type: Type.STRING } },
        },
        required: ["llmAverageScores", "llmExplanations"],
      }
    }
    // const response = await runLLM(prompt, config, this.client);
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