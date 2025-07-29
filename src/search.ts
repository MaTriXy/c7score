import { GenerateContentResponse, GenerateContentConfig, Type } from '@google/genai';
import { GoogleGenAI } from '@google/genai';

export class Search {
  private library: string;
  private client: GoogleGenAI;

  constructor(library: string, client: GoogleGenAI) {
    this.library = library;
    this.client = client;
  }

  async googleSearch(): Promise<string> {
    // Generates 15 questions based on the library
    const prompt = `
      Generate 15 questions, 10 of which should be common and practical 
      questions that developers frequently ask when using the library ${this.library}. 
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

      Example format:
      1. "Show me how to build a card component with shadow, hover effects, and truncated text in {self.library}"
      2. "How to create a responsive navigation bar with dropdown menus in ${this.library}"
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
    return response.text ?? '';
  }

  async generateSearchTopics(questions: string): Promise<string[][]> {
    // Generates 5 search topics for each question
    const prompt = `
      For each question about ${this.library}, generate 5 relevant search topics 
        as comma-separated keywords/phrases. These topics should help find the most 
        relevant documentation and code examples.

        Questions: ${questions}

        Your response should be formatted as a list of 15 elements, representing 
        each question, where each element is a list of 5 search topics. 

        Example output format: [["card components", "box shadow", "hover effects", "text truncation", "transition utilities"],
                                ["responsive navigation", "dropdown menus", "navigation bar", "responsive design", "navigation patterns"],
                                ...]
    `;

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties:{
            topics: {type: Type.ARRAY, items: {type: Type.ARRAY, items: {type: Type.STRING}}}
          },
          required: ["topics"],
        }
      },
    });
    const jsonResponse = JSON.parse(response.text ?? '');
    return jsonResponse.topics;
  }

  async fetchContext(topics: string[][], snippetUrl: string): Promise<string[][]> {
    // Gets the context/code snippets per topic for the library
    const contexts = []; // 15 x 5 = 75 contexts

    for (const questionTopics of topics) {  // total of 15 questions
      const questionContexts = [];  // 5 contexts per question
      for (const topic of questionTopics) {  // total of 5 topics per question
        const topicUrl = encodeURIComponent(topic);
        const url = `${snippetUrl}?tokens=10000&topic=${topicUrl}`;
        const headers = {"Accept-Encoding": "identity"};
        const response = await fetch(url, {headers});
        const context = await response.text();
        questionContexts.push(context);
      }
      contexts.push(questionContexts);
    }
    return contexts;
  }

  async evaluateContext(questions: string, context: string[][]): Promise<[number[], number, string[]]> {
    // Evaluates how well the snippets answer the questions based on 5 criteria
    const prompt = `
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

      Your response should contain two lists and one average score. The first list represents the scores for each question,
      and should have 15 elements. The second list represents the correspond explanations for each score,
      and should also have 15 elements.

      Example output format:
      [80, 75, 90, 65, 85, 70, 95, 60, 80, 75, 90, 65, 85, 70, 95],
      ["The context completely answers the question.",
        ...]
    `;

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {type: Type.ARRAY, items: {type: Type.NUMBER}},
            average_score: {type: Type.NUMBER},
            explanation: {type: Type.ARRAY, items: {type: Type.STRING}}
          }
        }
      }
    });
    console.log("Raw Response:", response.text);
    const jsonResponse = JSON.parse(response.text ?? '');
    console.log("JSON Response:", jsonResponse);
    return [jsonResponse.scores as number[], jsonResponse.average_score as number, jsonResponse.explanation as string[]];
  }
}