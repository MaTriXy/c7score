import { GoogleGenAI } from '@google/genai';

// Expected output for llmEvaluate
interface Scores {
  average_score: number;
  explanation: string;
}
interface ScoresCompare {
  average_score1: number;
  average_score2: number;
  explanation1: string;
  explanation2: string;
}

// Expected output for eval metrics
interface EvaluatorOutput {
  average_score: number;
  explanation: string;
}

export class Evaluator {
  private client: GoogleGenAI;
  private snippets: string;
  private snippets2?: string;

  constructor(client: GoogleGenAI, snippets: string, snippets2?: string) {
    this.client = client;
    this.snippets = snippets;
    this.snippets2 = snippets2 ?? "";
  }

  /**
   * Splits the entire snippet file into individual snippets
   * @returns The snippets
   */
  splitSnippets(): string[] {
    return this.snippets.split("\n" + "-".repeat(40) + "\n");
  }

  /**
   * Accesses the specified category of the snippet
   * @param snippet - The snippet to access
   * @param category - The category to access
   * @returns The category, or if the category is language or code, then it is everything after that
   */
  accessCategory(snippet: string, category: string): string | string[] | undefined {
    const okay = ["TITLE:", "DESCRIPTION:", "SOURCE:"];
    if (okay.includes(category)) {
      for (const line of snippet.split(/\r?\n/)) {
        if (line.startsWith(category)) {
          const parts = line.split(category);
          return parts[parts.length - 1].split("\n")[0];
        }
      }
    } else {
      return snippet.split(`${category}:`);
    }
  }

  /**
   * Evaluates the quality of the snippets based on 3 criteria: unique information, clarity, and correct syntax
   * @returns The average score and explanation
   */
  async llmEvaluate(): Promise<Scores> {
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

    Return only the JSON object with this schema:
    {{
        "average_score": int,  # average of scores, between 0 and 100
        "explanation": str  # Explanation for EACH score, separated by newlines, 3 explanations in total.
    }}
    Snippets: ${this.snippets}
    `;
    const countTokensResponse = await this.client.models.countTokens({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    if (countTokensResponse.totalTokens !== undefined && countTokensResponse.totalTokens < 1048576) {
      try {
        const response = await this.client.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                average_score: { type: 'number' },
                explanation: { type: 'string' },
              }
            }
          },
        });
        const jsonResponse = JSON.parse(response.text ?? '{}');
        const average_score = jsonResponse.average_score;
        const explanation = jsonResponse.explanation;
        return { average_score, explanation };
      } catch (error) {
        console.error('Error: ', error);
        return { average_score: -1, explanation: "There was an error during LLM evaluation: " + error };
      }
    } else {
      console.error('Prompt is too long, skipping LLM evaluation');
      return { average_score: -1, explanation: "Prompt is too long, skipped LLM evaluation" };
    }
  }

  /**
   * Evaluates the quality of the snippets in two different snippets
   * @param context1 - The first snippets
   * @param context2 - The second snippets
   */
  async llmEvaluateCompare(): Promise<ScoresCompare> {
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

    Return only the JSON object with this schema:
    {{
        "average_score1": int,  # average of scores, between 0 and 100
        "average_score2": int,  # average of scores, between 0 and 100
        "explanation1": str,  # Explanation for EACH score, separated by newlines, 3 explanations in total.
        "explanation2": str,  # Explanation for EACH score, separated by newlines, 3 explanations in total.
    }}
    Snippets1: ${this.snippets}
    Snippets2: ${this.snippets2}
    `;
    const countTokensResponse = await this.client.models.countTokens({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    if (countTokensResponse.totalTokens !== undefined && countTokensResponse.totalTokens < 1048576) {
      try {
        const response = await this.client.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                average_score: { type: 'number' },
                explanation: { type: 'string' },
              }
            }
          },
        });
        const jsonResponse = JSON.parse(response.text ?? '{}');
        const average_score1 = jsonResponse.average_score1;
        const average_score2 = jsonResponse.average_score2;
        const explanation1 = jsonResponse.explanation1;
        const explanation2 = jsonResponse.explanation2;
        return { average_score1, average_score2, explanation1, explanation2 };
      } catch (error) {
        console.error('Error: ', error);
        return { average_score1: -1, average_score2: -1, explanation1: "There was an error during LLM evaluation: " + error, explanation2: "There was an error during LLM evaluation: " + error };
      }
    } else {
      console.error('Prompt is too long, skipping LLM evaluation');
      return { average_score1: -1, average_score2: -1, explanation1: "Prompt is too long, skipped LLM evaluation", explanation2: "Prompt is too long, skipped LLM evaluation" };
    }
  }

  /**
   * Evaluates the formatting of the snippets
   * @returns The average score and explanation
   */
  async formatting(): Promise<EvaluatorOutput> {
    try {
      const components = ['TITLE: ', 'DESCRIPTION: ', 'LANGUAGE: ', 'SOURCE: ', 'CODE:'];
      const snippetsList = this.splitSnippets();
      let improperFormatting = 0;

      for (const snippet of snippetsList) {
        const codes = this.accessCategory(snippet, 'CODE') as string[];
        const langSnippet = this.accessCategory(snippet, 'LANGUAGE') as string[];

        // Tests
        const missingInfo = !components.every((c) => snippet.includes(c));
        const shortCode = codes.some(code => {
          const codeSnippet = code.split('CODE:')
          const cleanedCode = codeSnippet[codeSnippet.length - 1].replace(/```/g, '').trim().replace(/\n/g, ' ');
          return cleanedCode.split(' ').filter(token => token.trim() !== '').length < 5;
        })
        const multipleCodeSnippets = snippet.split('CODE:').length > 2 || snippet.split('LANGUAGE:').length > 2;
        const descriptionForLang = langSnippet.some(l => {
          if (l.includes("CODE:\n```")) {
            return l.split("\nCODE:")[0].trim().toLowerCase().includes("none") || l.split("\nCODE:")[0].trim().toLowerCase().includes("console")
          }
        })
        const containsList = codes.some(code => {
          const codeSnippet = code.split('CODE:')
          const cleanCode = codeSnippet[codeSnippet.length - 1].replace(/`/g, '').trim();
          return cleanCode.includes('◯') || (cleanCode.includes('1. ') && cleanCode.includes('2. '));
        })

        if ([missingInfo, shortCode, multipleCodeSnippets, descriptionForLang, containsList].some(test => test)) {
          improperFormatting++;
        }
      }

      return { average_score: ((snippetsList.length - improperFormatting) / snippetsList.length) * 100, explanation: "" };

    } catch (error) {
      console.error('Error in formatting: ', error);
      return { average_score: -1, explanation: "Error in formatting: " + error };
    }
  }

  /**
   * Evaluates the frequency of project metadata in the snippets
   * @returns The average score and explanation
   */
  async projectMetadata(): Promise<EvaluatorOutput> {
    try {
      const snippetsList = this.splitSnippets();
      let projectMetadata = 0;

      for (const snippet of snippetsList) {
        const langSnippet = this.accessCategory(snippet, 'LANGUAGE:') as string[];
        const source = this.accessCategory(snippet, 'SOURCE:') as string;
        const title = this.accessCategory(snippet, 'TITLE:') as string;
        const codes = this.accessCategory(snippet, 'CODE:') as string[];

        // Tests
        const bibtexCitations = langSnippet.some(l => {
          if (l.includes("CODE:\n```")) {
            return l.split("\nCODE:")[0].trim().toLowerCase().includes("bibtex")
          }
        })
        const licenseInfo = source.toLowerCase().includes('license')
        const directoryStructure = ['directory', 'structure', 'workflow'].some((t) => title.toLowerCase().includes(t)) &&
          codes.some(code => {
            const codeSnippet = code.split('CODE:')
            const cleanCode = codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '');
            return ['├─', '└─', '|-'].some((shape) => cleanCode.includes(shape));  // Code contains special directory symbols
          })
        if ([bibtexCitations, licenseInfo, directoryStructure].some(test => test)) {
          projectMetadata++;
        }
      }
      return { average_score: ((snippetsList.length - projectMetadata) / snippetsList.length) * 100, explanation: "" };
    } catch (error) {
      console.error('Error in project metadata: ', error);
      return { average_score: -1, explanation: "Error in project metadata: " + error };
    }
  }

  /**
   * Evaluates the frequency of initialization information in the snippets
   * @returns The average score and explanation
   */
  async initialization(): Promise<EvaluatorOutput> {
    try {
      const snippetsList = this.splitSnippets();
      let initializationCheck = 0;

      for (const snippet of snippetsList) {
        const title = this.accessCategory(snippet, 'TITLE:') as string;
        const codes = this.accessCategory(snippet, 'CODE:') as string[];

        // Tests
        const imports = ['import', 'importing'].some((t) => title.toLowerCase().includes(t)) &&
          codes.some(code => {
            const codeSnippet = code.split('CODE:')
            const singleLine = codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '').split('\n').filter(line => line.trim() !== '').length == 1;
            const noPath = !codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '').includes('/');
            return singleLine && noPath;
          })
        const installs = ['install', 'initialize', 'initializing'].some((t) => title.toLowerCase().includes(t)) &&
          codes.some(code => {
            const codeSnippet = code.split('CODE:')
            const cleanCode = codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '');
            return cleanCode.split('\n').filter(line => line.trim() !== '').length === 1;
          })
        if ([imports, installs].some(test => test)) {
          initializationCheck++;
        }
      }
      return { average_score: ((snippetsList.length - initializationCheck) / snippetsList.length) * 100, explanation: "" };
    } catch (error) {
      console.error('Error in initialization: ', error);
      return { average_score: -1, explanation: "Error in initialization: " + error };
    }
  }
}