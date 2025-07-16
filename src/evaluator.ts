import { GenerateContentConfig } from '@google/genai';

interface Client {
  models: {
    generateContent: (params: { model: string; contents: string; config?: GenerateContentConfig }) => Promise<{ text: string | undefined }>;
  };
}

interface EvaluationResult {
  scores: string;
  total: string;
}

export class Evaluator {
  private client: Client;
  private snippets: string;

  constructor(client: Client, snippets: string) {
    this.client = client;
    this.snippets = snippets;
  }

  splitSnippets(): string[] {
    return this.snippets.split('-'.repeat(40));
  }

  accessCategory(snippet: string, category: string): string | string[] {
    const snippetLower = snippet.toLowerCase();
    const validCategories = ['title', 'description', 'language', 'source'];

    if (validCategories.includes(category)) {
      const parts = snippetLower.split(`${category}:`);
      return parts.length > 1 ? parts[parts.length - 1].split('\n')[0].trim() : '';
    } else {
      return snippetLower.split(new RegExp(`${category}:`, 'i'));
    }
  }

  // Evaluates relevancy and correctness of snippets
  async llmEvaluate(importantInfo: string): Promise<EvaluationResult> {
    const snippetDelimiter = '-'.repeat(40);
    const prompt = `
      For each criterion, provide a score between 0 and 10, where 0 is the criterion was not met at all, 
      5 is the criterion was partially met, and 10 is the criterion was fully met with no room for improvement. 
      Also include a short explanation for each score. At the end of your response, calculate a **Total Score** 
      by summing the 8 individual scores. The maximum possible total is 80. Format your response so that the 
      score for each criterion and the explanation are on a new line. Each criterion compares the required 
      information with the snippets. The snippets are separated by ${snippetDelimiter} and the code blocks 
      are enclosed in \`\`\`. Do not include the snippets in your response. Make sure to start your response 
      with "&---". Your scores should represent a ratio of how many snippets meet the criterion out of the 
      total number of snippets.

      Criteria:
      1. The snippets include some variation of all the required information.
      2. Snippets contain unique information that is not already included in another snippet.
      3. There are no snippets that are confusingly worded or unclear.
      4. No snippets contain syntax errors.
      5. Snippets are formatted in such a way that you can easily isolate the code.
      6. Titles and descriptions are sensible.
      7. The programming language of the code snippet is correct.
      8. All the text, even in the code snippets, are in English.

      Required information: ${importantInfo}
      Snippets: ${this.snippets}
    `;

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        tools: [
          { functionDeclarations: [{ name: 'googleSearch', description: 'Search Google for relevant information' }] },
          { functionDeclarations: [{ name: 'urlContext', description: 'Retrieve context from a URL' }] },
        ]
      },
    });

    const responseText = response.text?.split('&---')[1] ?? '';
    const [scores, total] = responseText.split('**Total Score**: ');

    return { scores, total: total?.split('-')[1] ?? '0' };
  }

  // Checks if code snippets exist
  snippetComplete(): number {
    const components = ['TITLE: ', 'DESCRIPTION: ', 'LANGUAGE: ', 'SOURCE: ', 'CODE:'];
    const snippetsList = this.splitSnippets();
    let componentsComplete = 0;

    for (const snippet of snippetsList) {
      if (components.every((c) => snippet.includes(c))) {
        componentsComplete++;
      }
    }

    return (componentsComplete / snippetsList.length) * 10;
  }

  // Checks code verbosity
  codeSnippetLength(): number {
    const snippetsList = this.splitSnippets();
    let codeSnippets = 0;
    let totalCodeBlocks = 0;

    for (const snippet of snippetsList) {
      const languages = ['apidoc', 'terminal', 'shell', 'bash', 'text'];
      if (snippet.includes('code:') && languages.some((lang) => snippet.includes(lang))) {
        const codeBlocks = snippet.split('code:');
        // Check if every code block in the snippet is the proper length
        for (const block of codeBlocks.slice(1)) {
          totalCodeBlocks++;
          const cleanedBlock = block.replace(/```/g, ' ').replace(/\n/g, ' ');
          const wordsInCode = cleanedBlock.split(' ').length;
          if (wordsInCode > 5 || (['text', 'apidoc'].some((lang) => snippet.includes(lang)) && wordsInCode < 150)) {
            codeSnippets++;
          }
        }
      }
    }

    return totalCodeBlocks > 0 ? (codeSnippets / totalCodeBlocks) * 10 : 0;
  }

  // Checks if there are multiple code snippets in a snippet
  multipleCodeSnippets(): number {
    const snippetsList = this.splitSnippets();
    let multipleCodeSnippets = 0;

    // CODE and LANGUAGE repeat for multiple code snippets
    for (const snippet of snippetsList) {
      if (snippet.split('CODE:').length <= 2 || snippet.split('LANGUAGE:').length <= 2) {
        multipleCodeSnippets++;
      }
    }

    return (multipleCodeSnippets / snippetsList.length) * 10;
  }

  // Checks if the languages are actually descriptions
  languageDesc(): number {
    const snippetsList = this.splitSnippets();
    let languageChecker = 0;

    for (const snippet of snippetsList) {
      const langSnippet = this.accessCategory(snippet, 'language') as string;
      if (langSnippet.includes("none") || langSnippet.includes("console")) {
        languageChecker++;
      }
    }

    return ((snippetsList.length - languageChecker) / snippetsList.length) * 10;
  }

  // Checks if the code contains a list
  containsList(): number {
    const snippetsList = this.splitSnippets();
    let listCheck = 0;

    for (const snippet of snippetsList) {
      const codes = this.accessCategory(snippet, 'code') as string[];
      if (
        codes.some(code => {
          const cleanCode = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
          // Check for both 1. and 2. to make sure its a numbered list and not something else
          return cleanCode.includes('◯') || (cleanCode.includes('1. ') && cleanCode.includes('2. '));
        })
      ) {
        listCheck++;
      }
    }
    
    return ((snippetsList.length - listCheck) / snippetsList.length) * 10;
  }

  // Checks if there are bibtex citations
  bibtexCitations(): number {
    const snippetsList = this.splitSnippets();
    let bibtexCitations = 0;

    for (const snippet of snippetsList) {
      const lang = this.accessCategory(snippet, 'language') as string;
      if (lang.includes('bibtex')) {
        bibtexCitations++;
      }
    }

    return ((snippetsList.length - bibtexCitations) / snippetsList.length) * 10;
  }

  // Checks if there are any snippets about licensing
  licenseInfo(): number {
    const snippetsList = this.splitSnippets();
    let licenseCheck = 0;

    for (const snippet of snippetsList) {
      const source = this.accessCategory(snippet, 'source') as string;
      if (source.includes('license')) {
        licenseCheck++;
      }
    }

    return ((snippetsList.length - licenseCheck) / snippetsList.length) * 10;
  }

  // Checks if there are any snippets about the directory structure
  directoryStructure(): number {
    const snippetsList = this.splitSnippets();
    let directoryStructure = 0;

    for (const snippet of snippetsList) {
      const title = this.accessCategory(snippet, 'title') as string;
      const codes = this.accessCategory(snippet, 'code') as string[];

      if (
        ['directory', 'structure', 'workflow'].some((t) => title.includes(t)) &&
        codes.some(code => {
          const cleanCode = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
          return ['├─', '└─', '|-'].some((shape) => cleanCode.includes(shape));  // Code contains special directory symbols
        })
      ) {
        directoryStructure++;
      }
    }

    return ((snippetsList.length - directoryStructure) / snippetsList.length) * 10;
  }

  // Checks if there are any snippets about imports
  imports(): number {
    const snippetsList = this.splitSnippets();
    let importCheck = 0;

    for (const snippet of snippetsList) {
      const title = this.accessCategory(snippet, 'title') as string;
      const codes = this.accessCategory(snippet, 'code') as string[];
      if (
        ['import', 'importing'].some((t) => title.includes(t)) && // Title contains keywords
        codes.some(code => {
          const codeContent = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
          const numLines = codeContent.split('\n').filter(line => line.trim() !== '');
          return codeContent && numLines.length === 1 && !codeContent.includes('/');
        })
      ) {
        importCheck++;

      }
    }

    return ((snippetsList.length - importCheck) / snippetsList.length) * 10;
  }

  // Checks if there are any snippets about installations
  installs(): number {
    const snippetsList = this.splitSnippets();
    let installationCheck = 0;

    for (const snippet of snippetsList) {
      const snippetLower = snippet.toLowerCase();
      const title = this.accessCategory(snippetLower, 'title') as string;
      const codes = this.accessCategory(snippetLower, 'code') as string[];
      if (
        ['install', 'initialize', 'initializing'].some((t) => title.includes(t)) && // Title contains keywords
        codes.some(code => {
          const codeContent = code.split('code:').slice(-1)[0]?.trim().replace(/`/g, '');
          const numLines = codeContent.split('\n').filter(line => line.trim() !== '');
          return numLines.length === 1; // Code is a single line
        }) 
      ) {
        installationCheck++;
      }
    }

    return ((snippetsList.length - installationCheck) / snippetsList.length) * 10;
  }
}