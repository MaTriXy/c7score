import { Type, GoogleGenAI } from '@google/genai';
import { QuestionEvaluationOutput } from './types';
import axios from 'axios';
import { runLLM } from './utils';
import { questionEvaluationPrompt, questionEvaluationComparePrompt } from './prompts';

export class Search {
  private product: string;
  private client: GoogleGenAI;

  constructor(product: string, client: GoogleGenAI) {
    this.product = product;
    this.client = client;
  }

  /**
   * Generates 15 questions about a product one might ask an AI coding assistant.
   * @returns The 15 questions
   */
  async googleSearch(): Promise<string> {
    const prompt = `
      Generate 15 questions, 10 of which should be common and practical 
      questions that developers frequently ask when using the product ${this.product}. 
      These should represent real-world use cases and coding challenges. 

      Add 5 more questions that might not be very common but relevant to edge cases and 
      less common use cases. Format each question on a new line, numbered 1-15. 
      Questions should be specific and actionable, the kind that a developer would ask an 
      AI coding assistant.

      Focus on diverse topics like:
      - Component building (cards, navigation, forms, modals)
      - Responsive design patterns
      - Animation and transitions
      - Dark mode implementation
      - Custom styling and configuration
      - Performance optimization
      - Common UI patterns

      Example questions:
      1. "Show me how to build a card component with shadow, hover effects, and truncated text in ${this.product}"
      2. "How to create a responsive navigation bar with dropdown menus in ${this.product}"

      Do not include any headers in your response, only the list of questions. You may search 
      Google for the questions.
    `;

    // Google Search tool
    const searchTool = { googleSearch: {} };

    const config: object = {
      tools: [searchTool],
    }
    const response = await runLLM(prompt, config, this.client);
    if (response == undefined) {
      throw new Error("Response is undefined");
    } else {
      return response;
    }
  }

  /**
   * Generates 5 search topics for each question.
   * @param questions - The questions to generate search topics for
   * @returns 75 search topics
   */
  async generateSearchTopics(questions: string): Promise<string[][]> {
    const prompt = `
      For each question about ${this.product}, generate 5 relevant search topics 
        as comma-separated keywords/phrases. These topics should help find the most 
        relevant documentation and code examples.

        Questions: ${questions}

        Your response should be formatted as a list of 15 elements, representing 
        each question, where each element is a list of 5 search topics. 
    `;

    const config: object = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topics: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
        },
        required: ["topics"],
      }
    }
    const response = await runLLM(prompt, config, this.client);
    const jsonResponse = JSON.parse(response);
    if (jsonResponse.topics == undefined) {
      throw new Error("Topics are undefined");
    } else {
      return jsonResponse.topics;
    }
  }

  /**
   * Fetches 1 context/code snippet per topic for the library from Context7.
   * @param topics - The search topics
   * @param library - The library to fetch the context for
   * @param headerConfig - The header config to use for the Context7 API
   * @returns 75 context/code snippets
   */
  async fetchRelevantSnippets(topics: string[][], library: string, headerConfig: object): Promise<string[][]> {
    const snippet_title = "=".repeat(24) + "\nCODE SNIPPETS\n" + "=".repeat(24);
      const contexts = []; // 15 x 5 = 75 snippets
      for (const questionTopics of topics) {  // total of 15 questions
        const questionContexts = [];  // 5 snippets per question
        for (const topic of questionTopics) {  // total of 5 topics per question
          let snippets = "";
          const topicUrl = encodeURIComponent(topic);
          const url = `https://context7.com/api/v1${library}?tokens=10000&topic=${topicUrl}`;
          const response = await axios.get(url, headerConfig)
          snippets = String(response.data).replace(snippet_title, "").split("\n" + "-".repeat(40) + "\n")[0]; // Take first snippet
          questionContexts.push(snippets);
        }
        contexts.push(questionContexts);
      }
      return contexts;
  }

  /**
   * Evaluates how well the snippets answer the questions based on 5 criteria.
   * @param questions - The questions to evaluate. There may be two questions for comparing libraries
   * @param contexts - The context/code snippets per topic. There may be two context collections for comparing libraries
   * @returns The scores, average score, and explanations for the context collection(s)
   */
  async evaluateQuestions(questions: string, contexts: string[][][]): Promise<QuestionEvaluationOutput> {
    let prompt = "";
    if (contexts.length === 2) {
      prompt = questionEvaluationComparePrompt(questions, contexts[0], contexts[1]);
    } else {
      prompt = questionEvaluationPrompt(questions, contexts[0]);
    }
    const config: object = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        
        properties: {
          questionScores: { type: Type.ARRAY, minItems: contexts.length, items: { type: Type.ARRAY, minItems: 15, items: { type: Type.NUMBER } } },
          questionAverageScores: { type: Type.ARRAY, minItems: contexts.length, items: { type: Type.NUMBER } },
          questionExplanations: { type: Type.ARRAY, minItems: contexts.length, items: { type: Type.STRING } }
        },
        required: ["questionScores", "questionAverageScores", "questionExplanations"],
      }
    }
    const response = await runLLM(prompt, config, this.client);
    const jsonResponse = JSON.parse(response);
    if (jsonResponse.questionScores == undefined || jsonResponse.questionAverageScores == undefined || jsonResponse.questionExplanations == undefined) {
      throw new Error("Question scores are undefined");
    } else {
      return {
        questionScores: jsonResponse.questionScores as number[][],
        questionAverageScores: jsonResponse.questionAverageScores as number[],
        questionExplanations: jsonResponse.questionExplanations as string[][]
      }
    }
  }
}