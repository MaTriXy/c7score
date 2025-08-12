import { StaticEvaluatorOutput } from './types';
import * as staticMetrics from './staticMetrics';

export class StaticEvaluator {
  private snippets: string;

  constructor(snippets: string) {
    this.snippets = snippets;
  }

  /**
   * Splits the entire snippet file into individual snippets
   * @returns The individual snippets
   */
  splitSnippets(): string[] {
    return this.snippets.split("\n" + "-".repeat(40) + "\n");
  }

  /**
   * Evaluates the formatting of snippets
   * @returns The average score for the library
   */
  formatting(): StaticEvaluatorOutput {
    try {
      const snippetsList = this.splitSnippets();
      let improperFormatting = 0;

      for (const snippet of snippetsList) {

        const missingInfo = staticMetrics.snippetIncomplete( snippet);
        const shortCode = staticMetrics.codeSnippetLength(snippet);
        const descriptionForLang = staticMetrics.languageDesc(snippet);
        const containsList = staticMetrics.containsList(snippet);

        if ([missingInfo, shortCode, descriptionForLang, containsList].some(test => test)) {
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
   * @returns The average score for the library
   */
  metadata(): StaticEvaluatorOutput {
    try {
      const snippetsList = this.splitSnippets();
      let projectMetadata = 0;

      for (const snippet of snippetsList) {

        const citations = staticMetrics.citations(snippet);
        const licenseInfo = staticMetrics.licenseInfo(snippet);
        const directoryStructure = staticMetrics.directoryStructure(snippet);
        if ([citations, licenseInfo, directoryStructure].some(test => test)) {
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
   * @returns The average score for the library
   */
  initialization(): StaticEvaluatorOutput {
    try {
      const snippetsList = this.splitSnippets();
      let initializationCheck = 0;

      for (const snippet of snippetsList) {

        const imports = staticMetrics.imports(snippet);
        const installs = staticMetrics.installs(snippet);
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