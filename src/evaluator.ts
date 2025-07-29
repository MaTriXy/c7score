import { GoogleGenAI } from '@google/genai';

// Defines expected output type for llmEvaluate
interface Scores {
  average_score: number;
  explanation: string;
}

interface EvaluatorOutput {
  average_score: number;
  explanation: string;
}

export class Evaluator {
  private client: GoogleGenAI;
  private snippets: string;

  constructor(client: GoogleGenAI, snippets: string) {
    this.client = client;
    this.snippets = snippets;
  }

  splitSnippets(): string[] {
    // Splits the entire snippet file into individual snippets
    return this.snippets.split("\n" + "-".repeat(40) + "\n");
  }

  accessCategory(snippet: string, category: string): string | string[] | undefined {
    // Accesses the specified category of the snippet
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

  async llmEvaluate(): Promise<Scores> {
    // Evaluates the quality of the snippets based on 3 criteria: unique information, clarity, and correct syntax
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

  async formatting(): Promise<EvaluatorOutput> {
    // Check if the snippets are formatted correctly
    try{
      const components = ['TITLE: ', 'DESCRIPTION: ', 'LANGUAGE: ', 'SOURCE: ', 'CODE:'];
      const snippetsList = this.splitSnippets();
      let improperFormatting = 0;
  
      for (const snippet of snippetsList) {
        const codes = this.accessCategory(snippet, 'CODE') as string[];
        const langSnippet = this.accessCategory(snippet, 'LANGUAGE') as string[];
  
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


//   // Checks if there are bibtex citations
//   bibtexCitations(): number {
//     const snippetsList = this.splitSnippets();
//     let bibtexCitations = 0;

//     for (const snippet of snippetsList) {
//       const langSnippet = this.accessCategory(snippet, 'language') as string[];
//       if (langSnippet.some(l => {
//         if (l.includes("```")) {
//           return l.split("code:\n```")[0].trim().includes("bibtex")
//         }
//       })) {
//         bibtexCitations++;
//       }
//     }

//     return ((snippetsList.length - bibtexCitations) / snippetsList.length) * 10;
//   }

//   // Checks if there are any snippets about licensing
//   licenseInfo(): number {
//     const snippetsList = this.splitSnippets();
//     let licenseCheck = 0;

//     for (const snippet of snippetsList) {
//       const source = this.accessCategory(snippet, 'source') as string;
//       if (source.includes('license')) {
//         licenseCheck++;
//       }
//     }

//     return ((snippetsList.length - licenseCheck) / snippetsList.length) * 10;
//   }

//   // Checks if there are any snippets about the directory structure
//   directoryStructure(): number {
//     const snippetsList = this.splitSnippets();
//     let directoryStructure = 0;

//     for (const snippet of snippetsList) {
//       const title = this.accessCategory(snippet, 'title') as string;
//       const codes = this.accessCategory(snippet, 'code') as string[];

//       if (
//         ['directory', 'structure', 'workflow'].some((t) => title.includes(t)) &&
//         codes.some(code => {
//           const cleanCode = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
//           return ['├─', '└─', '|-'].some((shape) => cleanCode.includes(shape));  // Code contains special directory symbols
//         })
//       ) {
//         directoryStructure++;
//       }
//     }

//     return ((snippetsList.length - directoryStructure) / snippetsList.length) * 10;
//   }

//   // Checks if there are any snippets about imports
//   imports(): number {
//     const snippetsList = this.splitSnippets();
//     let importCheck = 0;

//     for (const snippet of snippetsList) {
//       const title = this.accessCategory(snippet, 'title') as string;
//       const codes = this.accessCategory(snippet, 'code') as string[];
//       if (
//         ['import', 'importing'].some((t) => title.includes(t)) && // Title contains keywords
//         codes.some(code => {
//           const codeContent = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
//           const numLines = codeContent.split('\n').filter(line => line.trim() !== '');
//           return codeContent && numLines.length === 1 && !codeContent.includes('/');
//         })
//       ) {
//         importCheck++;

//       }
//     }

//     return ((snippetsList.length - importCheck) / snippetsList.length) * 10;
//   }

//   // Checks if there are any snippets about installations
//   installs(): number {
//     const snippetsList = this.splitSnippets();
//     let installationCheck = 0;

//     for (const snippet of snippetsList) {
//       const snippetLower = snippet.toLowerCase();
//       const title = this.accessCategory(snippetLower, 'title') as string;
//       const codes = this.accessCategory(snippetLower, 'code') as string[];
//       if (
//         ['install', 'initialize', 'initializing'].some((t) => title.includes(t)) && // Title contains keywords
//         codes.some(code => {
//           const codeContent = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
//           const numLines = codeContent.split('\n').filter(line => line.trim() !== '');
//           return numLines.length === 1; // Code is a single line
//         }) 
//       ) {
//         installationCheck++;
//       }
//     }

//     return ((snippetsList.length - installationCheck) / snippetsList.length) * 10;
//   }
// }