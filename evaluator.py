import re
class Evaluator:
    def __init__(self, client, snippets):
        self.client = client
        self.snippets = snippets

    def split_snippets(self):
        return self.snippets.split("\-" * 40)
    
    def access_category(self, snippet, category):
        snippet_lower = snippet.lower()
        okay = ["title", "description", "language", "source"]
        if category in okay:
            return snippet_lower.split(f"{category}:")[-1].split("\n")[0].strip()
        # Handles code blocks
        else:
            return snippet_lower.split(f"{category}:")

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
        The maximum possible total is 80. Format your response so that
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
        3. There are no snippets that are confusingly worded or unclear.
        4. No snippets contain syntax errors.
        5. Snippets are formatted in such a way that you can easily isolate the code.
        6. Titles and descriptions are sensible.
        7. The programming language of the code snippet is correct.
        8. All the text, even in the code snippets, are in English.

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

    
    # Checks if code snippets exist
    def snippet_complete(self):
        comp = ["TITLE: ", "DESCRIPTION: ", "LANGUAGE: ", "SOURCE: ", "CODE:"]
        snippet_del = "\-" * 40
        snippets_list = self.snippets.split(snippet_del)
        comps_complete = 0
        for snippet in snippets_list:
            if all(c in snippet for c in comp):
                comps_complete += 1
        return (comps_complete / (len(snippets_list))) * 10
    
    # Checks code verbosity
    def code_snippet_length(self):
        snippets_list = self.split_snippets()
        code_snippets = 0
        for snippet in snippets_list:
            snippet_lower = snippet.lower()
            languages = ["apidoc", "terminal", "shell", "bash", "text"]
            if "code:" in snippet_lower and any(el in snippet_lower for el in languages):
                code_blocks = snippet.split("code:")
                snippet_code_blocks = 0
                # Check if every code block in the snippet is the proper length
                for block in code_blocks:
                    snippet_code_blocks += 1
                    block = block.replace("\`\`\`", " ").replace("\n", " ")
                    words_in_code = len(block.split(" "))
                    if words_in_code > 5 or (("text" or "apidoc") in snippet_lower and words_in_code < 150):
                        code_snippets += 1
        return (code_snippets / snippet_code_blocks)

    # Checks if there are multiple code snippets in a snippet
    def multiple_code_snippets(self):
        snippets_list = self.split_snippets()
        multiple_code_snippets = 0
        for snippet in snippets_list:
            # CODE and LANGUAGE repeat for multiple code snippets
            if len(snippet.split("CODE:")) <= 2 or len(snippet.split("LANGUAGE:")) <= 2:
                multiple_code_snippets += 1
        return (multiple_code_snippets / len(snippets_list)) * 10

    # Checks if the languages are actually descriptions
    def language_desc(self):
        snippets_list = self.split_snippets()
        language_checker = 0
        for snippet in snippets_list:
            lang_snippet = self.access_category(snippet, "language")
            if (len(lang_snippet.split(" ")) == 1) and (len(lang_snippet.split("-")) == 1) and (lang_snippet.lower() != "none"):
                language_checker += 1
        return (language_checker / len(snippets_list)) * 10
    
    # Checks if the code contains a list
    def contains_list(self):
        snippets_list = self.split_snippets()
        apidoc_list = 0
        for snippet in snippets_list:
            snippet_lower = snippet.lower()
            codes = self.access_category(snippet_lower, "code")
            if (
                any(sym in code.split("code:")[-1].strip().strip("\`") for code in codes for sym in ["◯", "1\."])
            ):
                apidoc_list += 1
        return ((len(snippets_list) - apidoc_list) / len(snippets_list)) * 10
    
    # Checks if there are bibtex citations
    def bibtex_citations(self):
        snippets_list = self.split_snippets()
        bibtex_citations = 0
        for snippet in snippets_list:
            snippet_lower = snippet.lower()
            lang = self.access_category(snippet_lower, "language")
            if "bibtex" in lang:
                bibtex_citations += 1
        return ((len(snippets_list) - bibtex_citations) / len(snippets_list)) * 10
    
    # Checks if there are any snippets about licensing
    def license_info(self):
        snippets_list = self.split_snippets()
        license_check = 0
        for snippet in snippets_list:
            snippet_lower = snippet.lower()
            source = self.access_category(snippet_lower, "source")
            if "license" in source:
                license_check += 1
        return ((len(snippets_list) - license_check) / len(snippets_list)) * 10

    # Checks if there are any snippets about the directory structure
    def directory_structure(self):
        snippets_list = self.split_snippets()
        directory_structure = 0
        for snippet in snippets_list:
            snippet_lower = snippet.lower()
            title = self.access_category(snippet_lower, "title")
            codes = self.access_category(snippet_lower, "code")
            if (
                any(t in title for t in ["directory", "structure", "workflow"])
                and any(shape in code.split("code:")[-1].strip().strip("\`") for code in codes for shape in ["├─", "└─", "|\-"])  # Code contains special directory symbols
            ):
                directory_structure += 1
        return ((len(snippets_list) - directory_structure) / len(snippets_list)) * 10
    
    # Checks if there are any snippets about imports
    def imports(self):
        snippets_list = self.split_snippets()
        import_check = 0
        for snippet in snippets_list:

            snippet_lower = snippet.lower()
            title = self.access_category(snippet_lower, "title")
            codes = self.access_category(snippet_lower, "code")
            if (
                any(t in title for t in ["import", "importing"])  # Title contains keywords
                and any(code.split("code:")[-1].strip().strip("\`").count("\n") == 2 for code in codes)  # Code is a single line
                and any("/" not in code.split("code:")[-1].strip().strip("\`") for code in codes)  # Code contains a path
            ):
                import_check += 1
        return ((len(snippets_list) - import_check) / len(snippets_list)) * 10
    
    # Checks if there are any snippets about installations
    def installs(self):
        snippets_list = self.split_snippets()
        installation_check = 0
        for snippet in snippets_list:

            snippet_lower = snippet.lower()
            title = self.access_category(snippet_lower, "title")
            codes = self.access_category(snippet_lower, "code")
            if (
                any(t in title for t in ["install", "initialize", "initializing"])  # Title contains keywords
                and any(code.split("code:")[-1].strip().strip("\`").count("\n") == 2 for code in codes)  # Code is a single line
            ):
                installation_check += 1
        return ((len(snippets_list) - installation_check) / len(snippets_list)) * 10



    


