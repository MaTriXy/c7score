import { Type, GoogleGenAI, GenerateContentConfig } from '@google/genai';
import fs from "fs/promises";
import { ContextEvaluationOutput, ContextEvaluationOutputPair } from './types';
import axios from 'axios';
import { runLLM } from './utils';

export class Search {
  private product: string;
  private client: GoogleGenAI;

  constructor(product: string, client: GoogleGenAI) {
    this.product = product;
    this.client = client;
  }

  /**
   * Generates 15 questions based on the library
   * @returns The 15 questions
   */
  async googleSearch(): Promise<string> {
    const prompt = `
      Generate 15 questions, 10 of which should be common and practical 
      questions that developers frequently ask when using the library ${this.product}. 
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
      google for the questions.
    `;

    // Google Search tool
    const searchTool = { googleSearch: {} };

    const modelConfig = {
      tools: [searchTool],
    };

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [prompt],
      config: modelConfig,
    });

    // Gets the number of citations for each question
    // console.log("Questions metadata:", response.candidates?.[0]?.groundingMetadata?.groundingSupports);
    return response.text ?? '';
  }

  /**
   * Generates 5 search topics for each question
   * @param questions - The questions to generate search topics for
   * @returns The search topics
   */
  // TODO: change the way that the project is specified (doesn't work for comparing libraries)
  async generateSearchTopics(questions: string): Promise<string[][]> {
    const prompt = `
      For each question about ${this.product}, generate 5 relevant search topics 
        as comma-separated keywords/phrases. These topics should help find the most 
        relevant documentation and code examples.

        Questions: ${questions}

        Your response should be formatted as a list of 15 elements, representing 
        each question, where each element is a list of 5 search topics. 
    `;

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["topics"],
        }
      },
    });
    const jsonResponse = JSON.parse(response.text ?? '');
    return jsonResponse.topics;
  }

  /**
   * Fetches the context/code snippets per topic for the library
   * @param topics - The search topics
   * @param library - The library to fetch the context for
   * @returns The context/code snippets per topic
   */
  async fetchContext(topics: string[][], library: string, header_config: object): Promise<string[][]> {
    const contexts = []; // 15 x 5 = 75 contexts
    for (const questionTopics of topics) {  // total of 15 questions
      const questionContexts = [];  // 5 contexts per question
      for (const topic of questionTopics) {  // total of 5 topics per question
        let snippets = "";
        const topicUrl = encodeURIComponent(topic);
        const url = `https://context7.com/api/v1/${library}?tokens=10000&topic=${topicUrl}`;
        const response = await axios.get(url, header_config);
        snippets = String(response.data).split("\n" + "-".repeat(40) + "\n")[0]; // Take first snippet

        // Redirects to another library
        if (snippets.split("redirected to this library: ").length > 1) {
          const getLibrary = snippets.split("redirected to this library: ")
          const newLibrary = getLibrary[getLibrary.length - 1].split(".", 1)[0];
          const newUrl = `https://context7.com/api/v1/${newLibrary}?tokens=10000&topic=${topicUrl}`;
          const newResponse = await axios.get(newUrl, header_config);
          const newContext = String(newResponse.data).split("\n" + "-".repeat(40) + "\n")[0]; // Take first snippet;
          snippets = newContext;
        }
        questionContexts.push(snippets);
      }
      contexts.push(questionContexts);
    }
    return contexts;
  }

  /**
   * Evaluates how well the snippets answer the questions based on 5 criteria
   * @param questions - The questions to evaluate
   * @param context - The context/code snippets per topic
   * @returns The scores, average score, and explanations
   */
  async evaluateContext(questions: string, context: string[][]): Promise<ContextEvaluationOutput> {
    let prompt = `
      You are evaluating documentation context for its quality and relevance in helping an AI 
      coding assistant answer the following question:

      Questions: "${questions}"

      Contexts (${context}):

      For each question, evaluate and score the context from 0-100 based on the following criteria:
      1. Relevance to the specific question (40%)
      2. Code example quality and completeness (25%)
      3. Practical applicability (15%)
      4. Coverage of requested features (15%)
      5. Clarity and organization (5%)

      Your response should contain 15 scores for each question, the average 
      score of the context, and explanations for each score.
    `;
    const config: object = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scores: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          average_score: { type: Type.NUMBER },
          explanation: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
    try {
      const response = await runLLM(prompt, config, this.client);
      const jsonResponse = JSON.parse(response);
      return {
        scores: jsonResponse.scores as number[],
        average_score: jsonResponse.average_score as number,
        explanation: jsonResponse.explanation as string[]
      };
    } catch (error) {
      console.error('Error: ', error);
      return { scores: [-1], average_score: -1, explanation: ["There was an error during context evaluation: " + error] };
    }
  }

  /**
     * Evaluates how well the snippets answer the questions based on 5 criteria
     * @param questions - The questions to evaluate
     * @param context1 - The context/code snippets per topic for the first library
     * @param context2 - The context/code snippets per topic for the second library
     * @returns The scores, average score, and explanations
     */
  async evaluateContextPair(questions: string, context1: string[][], context2: string[][]): Promise<ContextEvaluationOutputPair> {
    let prompt = `
    You are evaluating two different documentation contexts for their quality and relevance in helping an AI 
    coding assistant answer the following question:

    Questions: "${questions}"

    Contexts (${context1} and ${context2}):

    For each question, evaluate and score the context from 0-100 based on the following criteria:
    1. Relevance to the specific question (40%)
    2. Code example quality and completeness (25%)
    3. Practical applicability (15%)
    4. Coverage of requested features (15%)
    5. Clarity and organization (5%)

    Your response should include 15 scores for each context, 
    the average score of the context, and explanations for each score, all for
    each context.
  `;

    const config: object = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          context_scores: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
          context_average_scores: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
          context_explanations: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
        }
      }
    }
    try {
      const response = await runLLM(prompt, config, this.client);
      const jsonResponse = JSON.parse(response ?? '');
      return {
        context_scores: jsonResponse.context_scores as number[],
        context_average_scores: jsonResponse.context_average_scores as number[],
        context_explanations: jsonResponse.context_explanations as string[]
      };
    } catch (error) {
      console.error('Error: ', error);
      return { context_scores: [-1], context_average_scores: [-1], context_explanations: ["There was an error during context evaluation: " + error] };
    }
  }
}
