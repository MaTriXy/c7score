export const searchTopicsPrompt = (product: string, questions: string, newPrompt?: string) => {
    let prompt = `
        For each question about ${product}, generate 5 relevant search topics 
        as comma-separated keywords/phrases. These topics should help find the most 
        relevant documentation and code examples.

        Questions: ${questions}
        `;

    if (newPrompt) {
        prompt = newPrompt.replace("{{product}}", product).replace("{{questions}}", questions);
    }
    return prompt;
}

export const questionEvaluationPrompt = (contexts: string[][], questions: string, newPrompt?: string) => {
    let prompt = `
        You are evaluating documentation context for its quality and relevance in helping an AI 
        coding assistant answer the following question:

        Questions: ${questions}

        Context: ${contexts}

        For each question, evaluate and score the context from 0-100 based on the following criteria:
        1. Relevance to the specific question (50%)
        2. Practical applicability (15%)
        3. Coverage of requested features (35%)

        Your response should contain a list of scores, one average score, and one explanation for each score.
        `;

    if (newPrompt) {
        prompt = newPrompt.replace("{{contexts}}", contexts.toString()).replace("{{questions}}", questions);
    }
    return prompt;
}

export const questionEvaluationPromptCompare = (contexts: string[][][], questions: string, newPrompt?: string) => {
    let prompt = `
        You are evaluating two different documentation contexts for their quality and relevance in helping an AI 
        coding assistant answer the following question:

        Questions: ${questions}

        Contexts (${contexts[0]} and ${contexts[1]}):

        For each question, evaluate and score the context from 0-100 based on the following criteria:
        1. Relevance to the specific question (50%)
        2. Practical applicability (15%)
        3. Coverage of requested features (35%)

        Your response should contain one list that contains two sublists for each context (4 in total), where the first sublist represents 
        your responses for the first context and the second sublist represents your responses for the second context. 
        Each sublist should have two sublists, where the first sublist represents the scores for each question,
        and should have 15 elements. The second sublist represents the correspond explanations for each score,
        and should also have 15 elements. Each context will return an average score, with a total of 2 average scores.
        `;

    if (newPrompt) {
        prompt = newPrompt.replace("{{contexts[0]}}", contexts[0].toString()).replace("{{contexts[1]}}", contexts[1].toString()).replace("{{questions}}", questions);
        console.log(prompt);
    }
    return prompt;
}

export const llmEvaluationPrompt = (snippets: string, snippetDelimiter: string, newPrompt?: string) => {
    let prompt = `
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

        In your response, include the average score and the explanation for each score.

        Snippets: ${snippets}
        `;

    if (newPrompt) {
        prompt = newPrompt.replace("{{snippets}}", snippets).replace("{{snippetDelimiter}}", snippetDelimiter);
    }
    return prompt;
}

export const llmEvaluationPromptCompare = (snippets: string[], snippetDelimiter: string, newPrompt?: string) => {
    let prompt = `
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

        In your response, include the average score and the explanation of the score for each snippet source.

        Snippets 1: ${snippets[0]}
        Snippets 2: ${snippets[1]}
        `;

    if (newPrompt) {
        prompt = newPrompt.replace("{{snippets[0]}}", snippets[0]).replace("{{snippets[1]}}", snippets[1]).replace("{{snippetDelimiter}}", snippetDelimiter);
        console.log("Using new llm evaluation prompt compare");
    }
    return prompt;
}
