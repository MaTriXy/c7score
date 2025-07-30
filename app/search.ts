import { Type } from '@google/genai';
import { GoogleGenAI } from '@google/genai';

export class Search {
  private library: string;
  private client: GoogleGenAI;

  constructor(library: string, client: GoogleGenAI) {
    this.library = library;
    this.client = client;
  }

  /**
   * Generates 15 questions based on the library
   * @returns The 15 questions
   */
  // TODO: change the way that the project is specified (doesn't work for comparing libraries)
  async googleSearch(): Promise<string> {
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
      1. "Show me how to build a card component with shadow, hover effects, and truncated text in ${this.library}"
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

  /**
   * Generates 5 search topics for each question
   * @param questions - The questions to generate search topics for
   * @returns The search topics
   */
  // TODO: change the way that the project is specified (doesn't work for comparing libraries)
  async generateSearchTopics(questions: string): Promise<string[][]> {
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
  async fetchContext(topics: string[][], library: string): Promise<string[][]> {
    const contexts = []; // 15 x 5 = 75 contexts

    for (const questionTopics of topics) {  // total of 15 questions
      const questionContexts = [];  // 5 contexts per question
      for (const topic of questionTopics) {  // total of 5 topics per question
        let snippets = "";
        const topicUrl = encodeURIComponent(topic);
        const url = `https://context7.com${library}/llms.txt?tokens=10000&topic=${topicUrl}`;
        const headers = { "Accept-Encoding": "identity" };
        const response = await fetch(url, { headers });
        snippets = await response.text();

        // Redirects to another library
        if (snippets.split("redirected to this library: ").length > 1) {
          const getLibrary = snippets.split("redirected to this library: ")
          const newLibrary = getLibrary[getLibrary.length - 1].split(".", 1)[0];
          const newUrl = `https://context7.com${newLibrary}/llms.txt?tokens=10000&topic=${topicUrl}`;
          const newResponse = await fetch(newUrl, { headers });
          const newContext = await newResponse.text();
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
  async evaluateContext(questions: string, context: string[][]): Promise<[number[], number, string[]]> {
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
            scores: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            average_score: { type: Type.NUMBER },
            explanation: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    console.log("Raw Response:", response.text);
    const jsonResponse = JSON.parse(response.text ?? '');
    console.log("JSON Response:", jsonResponse);
    return [jsonResponse.scores as number[], jsonResponse.average_score as number, jsonResponse.explanation as string[]];
  }

/**
   * Evaluates how well the snippets answer the questions based on 5 criteria
   * @param questions - The questions to evaluate
   * @param context1 - The context/code snippets per topic for the first library
   * @param context2 - The context/code snippets per topic for the second library
   * @returns The scores, average score, and explanations
   */
async evaluateContextPair(questions: string, context1: string[][], context2: string[][]): Promise<[number[], number[], number, number, string[], string[]]> {
  const prompt = `
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

    Your response should contain one list that contains two sublists for each context (4 in total), where the first sublist represents 
    your responses for the first context and the second sublist represents your responses for the second context. 
    Each sublist should have two sublists, where the first sublist represents the scores for each question,
    and should have 15 elements. The second sublist represents the correspond explanations for each score,
    and should also have 15 elements. Each context will return an average score, with a total of 2 average scores.

    Example output format:
    [[80, 75, 90, 65, 85, 70, 95, 60, 80, 75, 90, 65, 85, 70, 95],
    ["The context completely answers the question.",
      ...],
    [80, 75, 90, 65, 85, 70, 95, 60, 80, 75, 90, 65, 85, 70, 95],
    ["The context completely answers the question.",
      ...]]
  `;

  const response = await this.client.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [prompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scores1: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          scores2: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          average_score1: { type: Type.NUMBER },
          average_score2: { type: Type.NUMBER },
          explanation1: { type: Type.ARRAY, items: { type: Type.STRING } },
          explanation2: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  console.log("Raw Response:", response.text);
  const jsonResponse = JSON.parse(response.text ?? '');
  console.log("JSON Response:", jsonResponse);
  return [jsonResponse.scores1 as number[], jsonResponse.scores2 as number[], jsonResponse.average_score1 as number, jsonResponse.average_score2 as number, jsonResponse.explanation1 as string[], jsonResponse.explanation2 as string[]];
}
}
