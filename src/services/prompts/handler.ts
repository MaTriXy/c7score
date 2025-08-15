import * as prompts from "./templates";

/**
 * Determines if the prompt will be the default or one provided by the user.
 * All prompts except for searchPrompt can be modified by the user.
 */

export const searchTopicsPromptHandler = (product: string, questions: string, newPrompt?: string) => {
    let prompt = newPrompt || prompts.searchTopicsPrompt;
    if (!prompt.includes("{{product}}") || !prompt.includes("{{questions}}")) {
        throw new Error("Prompt does not contain {{product}} or {{questions}}");
    }
    const finalPrompt = prompt.replace("{{product}}", product).replace("{{questions}}", questions);
    return finalPrompt;
}

export const questionEvaluationPromptHandler = (contexts: string[][], questions: string, newPrompt?: string) => {
    let prompt = newPrompt || prompts.questionEvaluationPrompt;
    if (!prompt.includes("{{questions}}") || !prompt.includes("{{contexts}}")) {
        throw new Error("Prompt does not contain {{questions}} or {{contexts}}");
    }
    const finalPrompt = prompt.replace("{{questions}}", questions).replace("{{contexts}}", contexts.toString());
    return finalPrompt;
}

export const questionEvaluationPromptCompareHandler = (contexts: string[][][], questions: string, newPrompt?: string) => {
    let prompt = newPrompt || prompts.questionEvaluationPromptCompare;
    if (!prompt.includes("{{questions}}") || !prompt.includes("{{contexts[0]}}") || !prompt.includes("{{contexts[1]}}")) {
        throw new Error("Prompt does not contain {{questions}} or {{contexts[0]}} or {{contexts[1]}}");
    }
    const finalPrompt = prompt.replace("{{questions}}", questions).replace("{{contexts[0]}}", contexts[0].toString()).replace("{{contexts[1]}}", contexts[1].toString());
    return finalPrompt;
}

export const llmEvaluationPromptHandler = (snippets: string, snippetDelimiter: string, newPrompt?: string) => {
    let prompt = newPrompt || prompts.llmEvaluationPrompt;
    if (!prompt.includes("{{snippets}}") || !prompt.includes("{{snippetDelimiter}}")) {
        throw new Error("Prompt does not contain {{snippets}} or {{snippetDelimiter}}");
    }
    const finalPrompt = prompt.replace("{{snippets}}", snippets).replace("{{snippetDelimiter}}", snippetDelimiter);
    return finalPrompt;
}

export const llmEvaluationPromptCompareHandler = (snippets: string[], snippetDelimiter: string, newPrompt?: string) => {
    let prompt = newPrompt || prompts.llmEvaluationPromptCompare;
    if (!prompt.includes("{{snippets[0]}}") || !prompt.includes("{{snippets[1]}}") || !prompt.includes("{{snippetDelimiter}}")) {
        throw new Error("Prompt does not contain {{snippets[0]}} or {{snippets[1]}} or {{snippetDelimiter}}");
    }
    const finalPrompt = prompt.replace("{{snippets[0]}}", snippets[0]).replace("{{snippets[1]}}", snippets[1]).replace("{{snippetDelimiter}}", snippetDelimiter);
    return finalPrompt;
}
