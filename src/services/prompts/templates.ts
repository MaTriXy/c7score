/**
 * All LLM Prompts
 */

export const searchPrompt = `
Generate 15 questions, 10 of which should be common and practical 
questions that developers frequently ask when using the product {{product}}. 
These should represent real-world use cases and coding challenges. 

Add 5 more questions that might not be very common but relevant to edge cases and 
less common use cases. Format each question on a new line, numbered 1-15. 
Questions should be specific and actionable, the kind that a developer would ask an 
AI coding assistant.

Focus on diverse topics like:
- Component building (cards, navigation, forms, modals)
- Responsive design patterns
- Animation and transitions
- Dark mode implementation
- Custom styling and configuration
- Performance optimization
- Common UI patterns

Example questions:
1. "Show me how to build a card component with shadow, hover effects, and truncated text in {{product}}"
2. "How to create a responsive navigation bar with dropdown menus in {{product}}"

Do not include any headers in your response, only the list of questions. You may search 
Google for the questions.
`
export const searchTopicsPrompt = `
For each question about {{product}}, generate 5 relevant search topics 
as comma-separated keywords/phrases. These topics should help find the most 
relevant documentation and code examples.

Questions: {{questions}}
`;

export const questionEvaluationPrompt = `
You are evaluating documentation context for its quality and relevance in helping an AI 
coding assistant answer the following question:

Questions: {{questions}}

Context: {{contexts}}

For each question, evaluate and score the context from 0-100 based on the following criteria:
1. Relevance to the specific question (50%)
2. Practical applicability (15%)
3. Coverage of requested features (35%)

Your response should contain a list of scores, one average score, and an explanation.
Make sure that the explanation is 1-2 sentences. Separate each sentence in the explanation with a new line.
`;

export const questionEvaluationPromptCompare = `
You are evaluating two different documentation contexts for their quality and relevance in helping an AI 
coding assistant answer the following question:

Questions: {{questions}}

Contexts ({{contexts[0]}} and {{contexts[1]}}):

For each question, evaluate and score the context from 0-100 based on the following criteria:
1. Relevance to the specific question (50%)
2. Practical applicability (15%)
3. Coverage of requested features (35%)

Your response should contain a nested list where each sublist contains the 15 scores associated with the context. 
The first of the sublists corresponds to the first context, and the second corresponds to the second context. 
You should also return a list that contains the average score for each context and a list of two explanations, 
one for each context. Make sure that each explanation is 1-2 sentences and each sentence is separated by a new line.
`;

export const llmEvaluationPrompt = `
Rate the quality of the snippets using the criteria. 
Your total score for the snippets should be between 0 and 100, 
where 0 is the indicates that the snippets did not meet the criteria 
at all, 50 is the criteria was partially met, and 100 is the 
criteria was fully met with no room for improvement.
The snippets are separated by {{snippetDelimiter}} 
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

In your response, include the average score and no more than a 1-2 sentence explanation for the score.
Make sure that each sentence is separated by a new line.

Snippets: {{snippets}}
`;

export const llmEvaluationPromptCompare = `
Compare the quality of two different snippet sources using the criteria. 
Your total score for the snippets should be between 0 and 100, 
where 0 is the indicates that the snippets did not meet the criteria 
at all, 50 is the criteria was partially met, and 100 is the 
criteria was fully met with no room for improvement.
The snippets are separated by {{snippetDelimiter}} 
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

In your response, include the average score and a 1-2 sentence explanation of the score for each snippet source.
Make sure that each sentence is separated by a new line.

Snippets 1: {{snippets[0]}}
Snippets 2: {{snippets[1]}}
`;
