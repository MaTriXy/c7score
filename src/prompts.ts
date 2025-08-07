
export function llmEvaluationComparePrompt(snippets1: string, snippets2: string, snippetDelimiter: string) {
    return `
    You are an expert code quality analyst. Your task 
    is to rate two collections of code snippets based on 
    the provided criteria and input. The snippets in each collection 
    are separated by ${snippetDelimiter} and 
    their code blocks are enclosed in \`\`\`.
    
    Evaluation Criteria:

    For each collection, rate the snippets on a scale of 0-100 for each of the 
    following criteria. A score of 50 indicates that the 
    criteria was partially met across the snippets, while 
    100 indicates it was fully met with no room for improvement.

    1. **Unique Information (Weight: 30%)**: Snippets contain unique information 
    and are not redundant. Minor overlap is acceptable, but identical 
    snippets are penalized.
    2. **Clarity (Weight: 30%)**: Snippets are not confusingly worded. Titles 
    and descriptions are sensible and accurate. All text, including 
    in code, is in English. There are no significant grammatical 
    or spelling errors.
    3. **Correct Syntax (Weight: 40%)**: Snippets are free from obvious 
    syntax errors. The code is well-formatted and does not contain placeholders 
    or ellipses (e.g., "..."). The programming language is correct for the 
    snippet's purpose.

    Output Format:

    For each collection of snippets, provide the average score and a brief 
    explanation of the average score.

    Snippet Collection 1: ${snippets1}
  
    Snippet Collection 2: ${snippets2}
    `;
}


export function llmEvaluationPrompt(snippets: string, snippetDelimiter: string) {
    return `
    You are an expert code quality analyst. Your task 
    is to rate a collection of code snippets based on 
    the provided criteria and input. The snippets to be 
    evaluated are separated by ${snippetDelimiter} and 
    their code blocks are enclosed in \`\`\`.
    
    Evaluation Criteria:

    Rate the snippets on a scale of 0-100 for each of the 
    following criteria. A score of 50 indicates that the 
    criteria was partially met across the snippets, while 
    100 indicates it was fully met with no room for improvement.

    1. **Unique Information (Weight: 30%)**: Snippets contain unique information 
    and are not redundant. Minor overlap is acceptable, but identical 
    snippets are penalized.
    2. **Clarity (Weight: 30%)**: Snippets are not confusingly worded. Titles 
    and descriptions are sensible and accurate. All text, including 
    in code, is in English. There are no significant grammatical 
    or spelling errors.
    3. **Correct Syntax (Weight: 40%)**: Snippets are free from obvious 
    syntax errors. The code is well-formatted and does not contain placeholders 
    or ellipses (e.g., "..."). The programming language is correct for the 
    snippet's purpose.

    Output Format:

    Provide the average score and a brief explanation of the average score.

    Snippet Collection: ${snippets}
    `;
}

export function questionEvaluationPrompt(questions: string, context: string[][]) {
    return `
    You are an expert in evaluating technical documentation. 
    Your task is to assess the quality and relevance of the 
    provided context in helping an AI 
    coding assistant answer a list of questions.

    Questions: ${questions}

    Context: ${context}

    Evaluation Criteria:

    For each question, evaluate and score the context from 0-100 
    on the following 5 criteria:

    1. Relevance to the specific question (40%)
    2. Code example quality and completeness (25%)
    3. Practical applicability (15%)
    4. Coverage of requested features (15%)
    5. Clarity and organization (5%)

    Output Format:

    Provide the 15 scores, one for each context, the average score of the context, and a brief explanation of the average score.
    `;
}

export function questionEvaluationComparePrompt(questions: string, context1: string[][], context2: string[][]) {
    return `
    You are an expert in evaluating technical documentation. 
    Your task is to assess the quality and relevance of the 
    provided contexts in helping an AI 
    coding assistant answer a list of questions.

    Questions: ${questions}

    Context 1: ${context1}
    Context 2: ${context2}

    Evaluation Criteria:

    For each question, evaluate and score the context from 0-100 
    on the following 5 criteria:

    1. Relevance to the specific question (40%)
    2. Code example quality and completeness (25%)
    3. Practical applicability (15%)
    4. Coverage of requested features (15%)
    5. Clarity and organization (5%)

    Output Format:

    For each context, provide the 15 scores, one for each question, 
    the average score of the context, and a brief explanation of the average score.
    That is, there should be two sets of 15 scores, two average scores, and two explanations.
    `;
}