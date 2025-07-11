
class Evaluator:
    def __init__(self, client, snippets):
        self.client = client
        self.snippets = snippets

    # Evaluates relevancy and correctness of snippets
    def llm_evaluate(self, important_info):
        snippet_del = "\-" * 40
        prompt = f"""For each criterion, provide
        a score between 0 and 10, where 0 is the   
        criterion was not met at all, 5 is the criterion 
        was partially met, and 10 is the criterion was fully met
        with no room for improvement. Also include 
        a short explanation for each score. At the end of your response, 
        calculate a **Total Score** by summing the 10 individual scores. 
        The maximum possible total is 100. Format your response so that
        the score for each criterion and the explanation
        are on a new line. Each criterion
        compares the required information with the snippets.
        The snippets are separated by 
        {snippet_del}
        and the code blocks are enclosed in \`\`\`.
        Do not include the snippets in your response.
        Make sure to start your response with "&---".
        Your scores should represent a ratio of how many
        snippets meet the criterion out of the total number of snippets.
        
        Criteria:
        1. The snippets include some variation of all the required information.
        2. Snippets contain unique information that is not already included in another snippet.
        3. The snippets do not contain general information that is unhelpful for coding (e.g., 
        library's license, development setup, file structure).
        4. There are no snippets that are confusingly worded or unclear.
        5. No snippets contain syntax errors.
        6. Snippets are formatted in such a way that you can easily isolate the code.
        7. Titles and descriptions are sensible.
        8. The programming language of the code snippet is correct.
        9. The code snippets are meaningful and not just a single command.
        10. All the text, even in the code snippets, are in English.

        Required information: {important_info}
        Snippets: {self.snippets}
        """
        response = self.client.models.generate_content(
            model="gemini-2.5-pro", contents=prompt
        )
        response = response.text.split('&---')[-1]

        scores = response.split("**Total Score**: ")[0]
        total = response.split("**Total Score**: ")[-1].split("-")[-1]

        # Returns thorough breakdown of scores and average score
        return scores, total
    
    # Checks if all the required components are present in each snippet
    def completion_evaluate(self):
        comp = ["TITLE: ", "DESCRIPTION: ", "LANGUAGE: ", "SOURCE: "]
        snippet_del = "\-" * 40
        snippets_list = self.snippets.split(snippet_del)
        comps_complete = 0
        snippet_code_blocks = 0
        for snippet in snippets_list:
            for c in comp:
                split_snippet = snippet.split(c)[-1].split("\n")[0].strip()
                if split_snippet:
                    comps_complete += 1
            # Check if the code snippet is not empty
            code_blocks = snippet.split("CODE:")  # Could have more than one code block
            for block in code_blocks:
                snippet_code_blocks += 1
                block = block.replace("\`\`\`", " ").strip()
                if block:
                    comps_complete += 1

        return comps_complete / (len(snippets_list) * 5 + snippet_code_blocks) * 10
    
    # Checks if any snippets are just about error messages
    def error_snippet(self):
        snippet_del = "\-" * 40
        snippets_list = self.snippets.split(snippet_del)
        non_error_snippets = 0
        for snippet in snippets_list:
            if not "Error" in snippet.split("TITLE: ")[-1].split("\n")[0].strip():
                non_error_snippets += 1
        return (non_error_snippets / len(snippets_list)) * 10
    
    # Checks code verbosity
    def code_snippet_length(self):
        snippet_del = "\-" * 40
        snippets_list = self.snippets.split(snippet_del)
        code_snippets = 0
        for snippet in snippets_list:
            snippet_lower = snippet.lower()
            languages = ["apidoc", "terminal", "shell", "bash", "text"]
            if "code:" in snippet_lower and any(el in snippet_lower for el in languages):
                code_blocks = snippet.split("code:")
                snippet_code_blocks = 0
                # Check if every code block in the snippet is valid
                for block in code_blocks:
                    snippet_code_blocks += 1
                    block = block.replace("\`\`\`", " ").replace("\n", " ")
                    words_in_code = len(block.split(" "))
                    if words_in_code > 5 and words_in_code < 35:
                        code_snippets += 1
        return (code_snippets / len(snippet_code_blocks)) * 10

    # Checks if there are multiple code snippets in a snippet
    def multiple_code_snippets(self):
        snippet_del = "\-" * 40
        snippets_list = self.snippets.split(snippet_del)
        multiple_code_snippets = 0
        for snippet in snippets_list:
            if len(snippet.split("CODE:")) <= 2 or len(snippet.split("LANGUAGE:")) <= 2:
                multiple_code_snippets += 1
        return (multiple_code_snippets / len(snippets_list)) * 10

    # Checks if the languages are actually descriptions
    def language_checker(self):
        snippet_del = "\-" * 40
        snippets_list = self.snippets.split(snippet_del)
        language_checker = 0
        for snippet in snippets_list:
            snippet_split = snippet.split("LANGUAGE:")[-1].split("\n")[0].strip()
            if (len(snippet_split.split(" ")) == 1) and (len(snippet_split.split("-")) == 1) and (snippet_split.lower() != "none"):
                language_checker += 1

        return (language_checker / len(snippets_list)) * 10
    




    


