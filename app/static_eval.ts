import { StaticEvaluatorOutput } from './types';

export class StaticEvaluator {
  private snippets: string;

  constructor(snippets: string) {
    this.snippets = snippets;
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
   * Evaluates the formatting of the snippets
   * @returns The average score
   */
  async formatting(): Promise<StaticEvaluatorOutput> {
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

      return { averageScore: ((snippetsList.length - improperFormatting) / snippetsList.length) * 100 };

    } catch (error) {
      throw new Error("Error in formatting: " + error);
    }
  }

  /**
   * Evaluates the frequency of project metadata in the snippets
   * @returns The average score
   */
  async projectMetadata(): Promise<StaticEvaluatorOutput> {
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
      return { averageScore: ((snippetsList.length - projectMetadata) / snippetsList.length) * 100 };
    } catch (error) {
      throw new Error("Error in project metadata: " + error);
    }
  }

  /**
   * Evaluates the frequency of initialization information in the snippets
   * @returns The average score
   */
  async initialization(): Promise<StaticEvaluatorOutput> {
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
      return { averageScore: ((snippetsList.length - initializationCheck) / snippetsList.length) * 100 };
    } catch (error) {
      throw new Error("Error in initialization: " + error);
    }
  }
}