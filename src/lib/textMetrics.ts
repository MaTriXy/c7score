import { Category } from "../lib/types.js";

/**
 * Accesses the specified category of the snippet
   * @param snippet - The snippet to access
   * @param category - The category to access. Must be one of the following: TITLE, DESCRIPTION, SOURCE, LANGUAGE, CODE (case-sensitive)
   * @returns The category, or if the category is language or code, then it is everything that occurs after the category keyword
 */
function accessCategory(snippet: string, category: Category): string | string[] {
    if (!snippet) {
        throw new Error("Snippet must be non-empty strings");
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
 * Checks if all categories exist in the snippet
 * @returns a boolean indicating if the snippet is incomplete
 */
export function snippetIncomplete(snippet: string): boolean {
    const components = ["TITLE:", "DESCRIPTION:", "LANGUAGE:", "SOURCE:", "CODE:"];
    return !components.every((c) => snippet.includes(c));
}

/**
 * Checks if the code is too short (defined as less than 5 words)
 * This could indicate that the code is a simple command, parsing error, or empty.
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
 * Checks if there are multiple code or language categories in a snippet
 * @returns A boolean indicating if there are multiple instances of CODE: or LANGUAGE:
 */
export function multipleCode(snippet: string): boolean {
    return snippet.split("CODE:").length > 2 || snippet.split("LANGUAGE:").length > 2;
}

/**
 * Checks if the LANGUAGE category is actually a description of the code
 * @returns A boolean indicating if the language is a description of the code (e.g., "CLI Arguments") or not a proper language (e.g., "console")
 */
export function languageDesc(snippet: string): boolean {
    const langs = accessCategory(snippet, 'LANGUAGE') as string[];
    return langs.some(lang => {
        const langSnippet = lang.split("CODE:")[0];
        const cleanLang = langSnippet.trim().toLowerCase();

        // Language contains multiple words
        if (cleanLang.split(" ").length > 1) {
            return true;
        }
        // Language contains keywords
        if (cleanLang.includes("none") || cleanLang.includes("console")) {
            return true
        }
    })
}

/**
 * Checks if the code contains a list
 * @returns A boolean indicating that code is actually a list
 */
export function containsList(snippet: string): boolean {
    const codes = accessCategory(snippet, 'CODE') as string[];

    // Unordered list: ◯, •, ☐, □, ○
    // Ordered list: 1., 2., 3., ...
    const unorderedMarkers = ["◯", "•", "☐", "□"];

    return codes.some(code => {
        const codeSnippet = code.split("CODE:")
        const cleanCode = codeSnippet[codeSnippet.length - 1].replace(/```/g, '').trim();

        const containsUnordered = unorderedMarkers.some(marker => cleanCode.includes(marker));

        const containsOrdered = cleanCode.includes('1. ') && cleanCode.includes('2. ')
        return containsUnordered || containsOrdered;
    });
}

/**
 * Checks if there are any common citation formats
 * @returns A boolean indicating that code is actually a citation
 */
export function citations(snippet: string): boolean {
    const citationFormats = ["bibtex", "biblatex", "ris", "mods", "marc", "csl json"]
    const langs = accessCategory(snippet, "LANGUAGE") as string[];
    return langs.some(lang => {
        const langSnippet = lang.split("CODE:")[0];
        const cleanLang = langSnippet.trim().replace(/\r?\n/g, "").toLowerCase();
        return citationFormats.some(format => cleanLang.includes(format))
    })
}

/**
 * Checks if the snippet is about licensing
 * @returns A boolean indicating that code is about a license
 */
export function licenseInfo(snippet: string): boolean {
    const source = (accessCategory(snippet, "SOURCE") as string).toLowerCase();
    return source.includes('license')
}

/**
 * Checks if the snippet is about the directory structure
 * @returns A boolean indicating that code is about a directory structure
 */
export function directoryStructure(snippet: string): boolean {
    const directoryKeywords = ["directory", "structure", "workflow", "filesystem"];
    const title = (accessCategory(snippet, "TITLE") as string).toLowerCase();
    const codes = accessCategory(snippet, "CODE") as string[];
    const titleContainsDirectory = directoryKeywords.some((keyword) => title.includes(keyword));

    const treeSymbols = ["├", "└", "|-"];
    return titleContainsDirectory &&
        codes.some(code => {
            const codeSnippet = code.split("CODE:")
            const cleanCode = codeSnippet[codeSnippet.length - 1].trim();
            return treeSymbols.some(symbol => cleanCode.includes(symbol));
        })
}

/**
 * Checks if the snippet is about imports
 * @returns A boolean indicating that code is about imports
 */
export function imports(snippet: string): boolean {
    const importKeywords = ["import", "importing"]
    const title = (accessCategory(snippet, "TITLE") as string).toLowerCase();
    const codes = accessCategory(snippet, "CODE") as string[];
    return importKeywords.some((t) => title.includes(t)) &&
        codes.some(code => {
            const codeSnippet = code.split("CODE:")
            const cleanedCode = codeSnippet[codeSnippet.length - 1].trim().replace(/```/g, "");
            const singleLine = cleanedCode.split(/\r?\n/).filter(line => line.trim() !== "").length == 1;
            // Not a descriptive import statement such as a specific path
            const noPath = !cleanedCode.includes("/");
            return singleLine && noPath;
        })
}

/**
 * Checks if the snippet is about installations
 * @returns A boolean indicating that code is about installations
 */
export function installs(snippet: string): boolean {
    const installKeywords = ["install", "initialize", "initializing", "installation"];
    const title = (accessCategory(snippet, "TITLE") as string).toLowerCase();
    const codes = accessCategory(snippet, "CODE") as string[];
    return installKeywords.some((t) => title.includes(t)) &&
        codes.some(code => {
            const codeSnippet = code.split("CODE:")
            const cleanCode = codeSnippet[codeSnippet.length - 1].trim().replace(/```/g, "");
            const singleLine = cleanCode.split(/\r?\n/).filter(line => line.trim() !== "").length === 1;
            return singleLine;
        })
}