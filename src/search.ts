import { GenerateContentParameters, GenerateContentResponse, GenerateContentConfig } from '@google/genai';

interface SearchClient {
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
}

export class Search {
  private url: string;
  private client: SearchClient;
  private modelConfig: GenerateContentConfig;

  constructor(url: string, client: SearchClient, modelConfig: GenerateContentConfig) {
    this.url = url;
    this.client = client;
    this.modelConfig = modelConfig;
  }

  async googleSearch(): Promise<GenerateContentResponse> {
    const prompt = `
      Determine the most crucial technical information from the URL, ${this.url}, 
      that would help you use it when coding. Some examples of technical information 
      include, but are not limited to example implementations and commonly used classes. 
      The technical information should be helpful when implementing and using the library 
      in code, and not just general information about it. For example, DO NOT include 
      information about the library's license, development setup, file structure, 
      installation, etc. You CAN include code chunks if they are important to the library, 
      but only from ${this.url}.

      Present your response as a numbered list of roughly 10 pieces of information. Each 
      item must have a clear heading with between 1-5 sentences and no more than one code 
      snippet. The code snippet should be formatted as a code block.

      You may use the url context tool to access the content of ${this.url}, or one 
      of the links from the provided URL. If the provided URL links to other websites, you 
      may use those sources to extract code snippets or additional information.

      Double check that the information is relevant to the library and not just general information about it.
    `;
    try {
    const content = await this.client.generateContent({
      model: 'gemini-2.5-pro',
      contents: [prompt],
    });
    return content;
    } catch (error) {
      console.error(`Error generating search results for ${this.url}:`, error);
      throw error;
    }
  }
}