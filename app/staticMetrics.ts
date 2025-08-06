
/**
   * Accesses the specified category of the snippet
   * @param snippet - The snippet to access
   * @param category - The category to access. Must be one of the following: TITLE, DESCRIPTION, SOURCE, LANGUAGE, CODE (case-sensitive)
   * @returns The category, or if the category is language or code, then it is everything after that
   */
function accessCategory(snippet: string, category: string): string | string[] {
  const acceptableCategories = ["TITLE", "DESCRIPTION", "SOURCE", "LANGUAGE", "CODE"];
  if (!acceptableCategories.includes(category)) {
    throw new Error(`Invalid category: ${category}`);
  }
  if (!snippet || !category) {
    throw new Error("Snippet and category must be non-empty strings");
  }
  const snippetLines = snippet.split(/\r?\n/);
  if (category === "LANGUAGE" || category === "CODE") {
    // returns [content] if category exists, [] if it doesn't
    return snippet.split(`${category}:`).slice(1);
  }
  for (const line of snippetLines) {
    if (line.trim().startsWith(`${category}:`)) {
      return line.replace(`${category}:`, "").trim();
    }
  }
  return "";
}

/**
 * Checks if code snippets exist
 * @returns a boolean indicating if the snippet is incomplete
 */
export function snippetIncomplete(snippet: string): boolean {
  const components = ["TITLE:", "DESCRIPTION:", "LANGUAGE:", "SOURCE:", "CODE:"];
  return !components.every((c) => snippet.includes(c));
}

/**
 * Checks if the code is too short (defined as less than 5 tokens)
 * @returns a boolean indicating if the code snippet is too short
 */
export function codeSnippetLength(snippet: string): boolean {
  const codes = accessCategory(snippet, "CODE") as string[];
  return codes.some(code => {
    const codeSnippets = code.split("CODE:")
    const codeBlock = codeSnippets[codeSnippets.length - 1].replace(/```/g, "")
    const cleanedCode = codeBlock.trim().replace(/\r?\n/g, " ");
    return cleanedCode.split(" ").filter(token => token.trim() !== "").length < 5;
  })
}

/**
 * Checks if there are multiple code snippets in a snippet
 * @returns A boolean indicating if there are more than 2 components when splitting on CODE: or LANGUAGE:
 */
export function multipleCode(snippet: string): boolean {
  return snippet.split("CODE:").length > 2 || snippet.split("LANGUAGE:").length > 2;
}

/**
 * Checks if the languages are actually descriptions
 * @returns A boolean indicating if the language is a description of the code (e.g., "CLI Arguments") or not a proper language (e.g., "console")
 */
export function languageDesc(snippet: string): boolean {
  const langSnippets = accessCategory(snippet, 'LANGUAGE') as string[];
  return langSnippets.some(langSnippet => {
    const lang = langSnippet.split("CODE:")[0];
    const langText = lang.trim().toLowerCase();

    // Language contains multiple words
    if (langText.split(" ").length > 1) {
      return true;
    }
    // Language contains keywords
    if (langText.includes("none") || langText.includes("console")) {
      return true
    }
  })
}

/**
 * Checks if the code contains a list
 * @returns The score
 */
export function containsList(snippet: string): boolean {
  const codes = accessCategory(snippet, 'CODE') as string[];

  // Unordered list: ◯, •, ☐, □, ○
  // Ordered list: 1., 2., 3., ...
  const unorderedMarkers = ["◯", "•", "☐", "□"];

  return codes.some(code => {
    const codeSnippet = code.split("CODE:")
    const cleanCode = codeSnippet[codeSnippet.length - 1].replace(/```/g, '').trim();

    const containsUnordered = unorderedMarkers.some(marker => 
      cleanCode.includes(marker)
    );

    const containsOrdered = cleanCode.includes('1. ') && cleanCode.includes('2. ')
    return containsUnordered || containsOrdered;
  });
}

/**
 * Checks if there are bibtex citations
 * @returns The score
 */
export function bibtexCitations(snippet: string): boolean {
  const langSnippet = accessCategory(snippet, 'LANGUAGE') as string[];
  return langSnippet.some(l => {
    if (l.includes("CODE:\n```")) {
      return l.split("\nCODE:")[0].trim().toLowerCase().includes("bibtex")
    }
  })
}

/**
 * Checks if there are any snippets about licensing
 * @returns The score
 */
export function licenseInfo(snippet: string): boolean {
  const source = accessCategory(snippet, 'SOURCE') as string;
  return source.toLowerCase().includes('license')
}

/**
 * Checks if there are any snippets about the directory structure
 * @returns The score
 */
export function directoryStructure(snippet: string): boolean {
  const title = accessCategory(snippet, 'TITLE') as string;
  const codes = accessCategory(snippet, 'CODE') as string[];
  return ['directory', 'structure', 'workflow', "filesystem"].some((t) => title.toLowerCase().includes(t)) &&
    codes.some(code => {
      const codeSnippet = code.split('CODE:')
      const cleanCode = codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '');
      return ['├─', '└─', '|-'].some((shape) => cleanCode.includes(shape));  // Code contains special directory symbols
    })
}

/**
 * Checks if there are any snippets about imports
 * @returns The score
 */
export function imports(snippet: string): boolean {
  const title = accessCategory(snippet, 'TITLE') as string;
  const codes = accessCategory(snippet, 'CODE') as string[];
  return ['import', 'importing'].some((t) => title.toLowerCase().includes(t)) &&
    codes.some(code => {
      const codeSnippet = code.split('CODE:')
      const singleLine = codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '').split('\n').filter(line => line.trim() !== '').length == 1;
      const noPath = !codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '').includes('/');
      return singleLine && noPath;
    })
}

/**
 * Checks if there are any snippets about installations
 * @returns The score
 */
export function installs(snippet: string): boolean {
  const title = accessCategory(snippet, 'TITLE') as string;
  const codes = accessCategory(snippet, 'CODE') as string[];
  return ['install', 'initialize', 'initializing'].some((t) => title.toLowerCase().includes(t)) &&
    codes.some(code => {
      const codeSnippet = code.split('CODE:')
      const cleanCode = codeSnippet[codeSnippet.length - 1].trim().replace(/`/g, '');
      return cleanCode.split('\n').filter(line => line.trim() !== '').length === 1;
    })
}