from linter import *
import tempfile
from pydantic import BaseModel
import json

class Evaluator:
    """Evaluates the quality of the snippets"""
    
    def __init__(self, client, snippets):
        self.client = client
        self.snippets = snippets

    def split_snippets(self):
        return self.snippets.split("-" * 40)
    
    def access_category(self, snippet, category):
        snippet_lower = snippet.lower()
        okay = ["title", "description", "source"]
        if category in okay:
            parts = snippet_lower.split(f"{category}:")
            if len(parts) > 1:
                return parts[len(parts) - 1].split("\n")[0].strip()

        else:
            return snippet_lower.split(f"{category}:")

    # Evaluates relevancy and correctness of snippets
    def llm_evaluate(self, important_info):
        snippet_del = "-" * 40
        prompt = f"""For each criterion, provide
        a score between 0 and 10, where 0 is the   
        criterion was not met at all, 5 is the criterion 
        was partially met, and 10 is the criterion was fully met
        with no room for improvement. Each criterion
        compares the required information with the snippets.
        The snippets are separated by 
        {snippet_del}
        and the code blocks are enclosed in ```.
        Your scores should represent a ratio of how many
        snippets meet the criterion out of the total number of snippets.
        The maximum possible total score is 80 and the minimum is 0.
        Refrain from giving a score between 0-5 for any criterion unless there is an extreme or frequent case.
        
        Criteria:
        1. The snippets include some variation of all the required information. It does not need to be exact, but should
        convery the same idea.
        2. Snippets contain unique information that is not already included in another snippet. There can be some overlap, but
        the snippets should not be identical.
        3. There are no snippets that are confusingly worded or unclear. This could be grammatical or spelling errors.
        4. No snippets contain any obvious syntax errors.
        5. Snippets are formatted in such a way that you can easily isolate the code (e.g., no placeholders or ellipses).
        6. Titles and descriptions are sensible (e.g., the description shouldn't be about requests when the code is about
        visualizing data).
        7. The programming language of the code snippet is correct.
        8. All the text, even in the code snippets, are in English.

        Return only the JSON object with this schema:
        {{
            "scores": [int, ..., int],  # Has length of 8, each element is a score between 0 and 10
            "total": int,  # Sum of scores, between 0 and 80
            "explanation": str  # Explanation for EACH score, separated by newlines, 8 explanations in total.
        }}

        Required information: {important_info}
        Snippets: {self.snippets}
        """
        class Scores(BaseModel):
            scores: list[int]
            total: int
            explanation: str

        # Add a check to see if the prompt is too long
        total_tokens = self.client.models.count_tokens(
            model="gemini-2.5-pro", contents=prompt
        ).total_tokens
        if total_tokens < 1048576:  # 1048576 is the max tokens for Gemini 2.5 Pro
            try:
                response = self.client.models.generate_content(
                    model="gemini-2.5-pro", contents=prompt, config= {
                        "response_mime_type": "application/json",
                        "response_schema": Scores
                    }
                )
                json_response = json.loads(response.text)
                scores = json_response["scores"]
                total = json_response["total"]
                explanation = json_response["explanation"]

                # Returns thorough breakdown of scores, sum of scores
                return scores, total, explanation
            
            except Exception as e:
                print(f"Error: {e}")
                return [0] * 8, 0, "There was an error during LLM evaluation: " + str(e)
        else:
            print("Prompt is too long, skipping LLM evaluation")
            return [0] * 8, 0, "Prompt is too long, skipped LLM evaluation"

        
    # Checks if code snippets exist
    def snippet_complete(self):
        try:
            comp = ["TITLE: ", "DESCRIPTION: ", "LANGUAGE: ", "SOURCE: ", "CODE:"]
            snippets_list = self.split_snippets()
            comps_complete = 0
            for snippet in snippets_list:
                if all(c in snippet for c in comp):
                    comps_complete += 1
            return (comps_complete / (len(snippets_list))) * 10, "No errors found"
        except Exception as e:
            print(f"Error in snippet_complete: {e}")
            return 0, "Error in snippet_complete: " + str(e)
    
    # Checks code verbosity
    def code_snippet_length(self):
        try:
            snippets_list = self.split_snippets()
            code_snippets = 0
            for snippet in snippets_list:
                codes = self.access_category(snippet, "code")
                if any(len([token for token in code.split("code:")[-1].replace("```", "").strip().replace("\n", " ").split(" ") if token.strip()]) < 5 for code in codes):
                    code_snippets += 1
            return ((len(snippets_list) - code_snippets) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in code_snippet_length: {e}")
            return 0, "Error in code_snippet_length: " + str(e)

    # Checks if there are multiple code snippets in a snippet
    def multiple_code_snippets(self):
        try:
            snippets_list = self.split_snippets()
            multiple_code_snippets = 0
            for snippet in snippets_list:
                # CODE and LANGUAGE repeat for multiple code snippets
                if len(snippet.split("CODE:")) > 2 or len(snippet.split("LANGUAGE:")) > 2:
                    multiple_code_snippets += 1
            return ((len(snippets_list) - multiple_code_snippets)) / len(snippets_list) * 10, "No errors found"
        except Exception as e:
            print(f"Error in multiple_code_snippets: {e}")
            return 0, "Error in multiple_code_snippets: " + str(e)

    # Checks if the languages are actually descriptions
    def language_desc(self):
        try:
            snippets_list = self.split_snippets()
            language_checker = 0
            for snippet in snippets_list:
                lang_snippet = self.access_category(snippet, "language")

                if any(
                    (("none" in l.split("\ncode:")[0].strip() or "console" in l.split("\ncode:")[0].strip()))
                    for l in lang_snippet
                    if "code:\n```" in l
                ):
                    language_checker += 1
            return ((len(snippets_list) - language_checker) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in language_desc: {e}")
            return 0, "Error in language_desc: " + str(e)
    
    # Checks if the code contains a list
    def contains_list(self):
        try:
            snippets_list = self.split_snippets()
            apidoc_list = 0
            for snippet in snippets_list:
                codes = self.access_category(snippet, "code")
                if (
                    # Check for both 1. and 2. to make sure its a numbered list and not something else
                    any("◯" in code.split("code:")[-1].strip().strip("`") for code in codes)
                    or any(("1. " and "2. ") in code.split("code:")[-1].strip().strip("`") for code in codes)
                ):
                    apidoc_list += 1
            return ((len(snippets_list) - apidoc_list) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in contains_list: {e}")
            return 0, "Error in contains_list: " + str(e)
        
    # Checks if there are bibtex citations
    def bibtex_citations(self):
        try:
            snippets_list = self.split_snippets()
            bibtex_citations = 0
            for snippet in snippets_list:
                lang_snippet = self.access_category(snippet, "language")
            if any(
                ("bibtex" in l.split("\ncode:")[0].strip())
                for l in lang_snippet
                if "code:\n```" in l
            ):
                bibtex_citations += 1
            return ((len(snippets_list) - bibtex_citations) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in bibtex_citations: {e}")
            return 0, "Error in bibtex_citations: " + str(e)
    
    # Checks if there are any snippets about licensing
    def license_info(self):
        try:
            snippets_list = self.split_snippets()
            license_check = 0
            for snippet in snippets_list:
                source = self.access_category(snippet, "source")
                if "license" in source:
                    license_check += 1
            return ((len(snippets_list) - license_check) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in license_info: {e}")
            return 0, "Error in license_info: " + str(e)
    
    # Checks if there are any snippets about the directory structure
    def directory_structure(self):
        try:
            snippets_list = self.split_snippets()
            directory_structure = 0
            for snippet in snippets_list:
                title = self.access_category(snippet, "title")
                codes = self.access_category(snippet, "code")
                if (
                    any(t in title for t in ["directory", "structure", "workflow"])
                    and any(shape in code.split("code:")[-1].strip().strip("`") for code in codes for shape in ["├─", "└─", "|-"])  # Code contains special directory symbols
                ):
                    directory_structure += 1
            return ((len(snippets_list) - directory_structure) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in directory_structure: {e}")
            return 0, "Error in directory_structure: " + str(e)
    
    # Checks if there are any snippets about imports
    def imports(self):
        try:
            snippets_list = self.split_snippets()
            import_check = 0
            for snippet in snippets_list:
                title = self.access_category(snippet, "title")
                codes = self.access_category(snippet, "code")
                if (
                    any(t in title for t in ["import", "importing"])  # Title contains keywords
                    and any(code.split("code:")[-1].strip().strip("`").count("\n") == 2 for code in codes)  # Code is a single line
                    and any("/" not in code.split("code:")[-1].strip().strip("`") for code in codes)  # Code contains a path
                ):
                        import_check += 1
            return ((len(snippets_list) - import_check) / len(snippets_list)) * 10, "No errors found"
        except Exception as e:
            print(f"Error in imports: {e}")
            return 0, "Error in imports: " + str(e)
    
    # Checks if there are any snippets about installations
    def installs(self):
        try:
            snippets_list = self.split_snippets()
            installation_check = 0
            for snippet in snippets_list:
                title = self.access_category(snippet, "title")
                codes = self.access_category(snippet, "code")
                if (
                    any(t in title for t in ["install", "initialize", "initializing"])  # Title contains keywords
                    and any(code.split("code:")[-1].strip().strip("`").count("\n") == 2 for code in codes)  # Code is a single line
                ):
                    installation_check += 1
            return ((len(snippets_list) - installation_check) / len(snippets_list)) * 10, "No errors found"  
        except Exception as e:
            print(f"Error in installs: {e}")
            return 0, "Error in installs: " + str(e)

    def syntax_eval(self):
        try:
            snippets_list = self.split_snippets()
            syntax_eval = 0
            lang_code_block = 0
            snippet_num = 0
            for snippet in snippets_list:
                snippet_num += 1
                lang = self.access_category(snippet, "language")
                to_ignore = ["console", "none", "configuration", "text", "makefile"]
                # If theres multiple code blocks/languages
                for l in lang:
                    if not any(s in l for s in to_ignore):
                        if "code:\n```" in l:
                            lang_code_block += 1
                            lang_desc = l.split("\ncode:")[0].strip().replace("+", "").split("/")[0]
                            if any(s in lang_desc for s in ["shell", "bash", "zsh", "terminal", "bsh", "sh"]):
                                lang_desc = "shell"
                            code = l.split("\ncode:")[-1].replace("```", "").strip()

                            linter_type = f"lint_{lang_desc}"
                            temp = tempfile.NamedTemporaryFile()
                            with open(temp.name, "w") as f:
                                f.write(code)
                            func = getattr(Linter(temp.name), linter_type)
                            result = func()
                            syntax_eval += result
            return (syntax_eval / lang_code_block), "No errors found"
        except Exception as e:
            print(f"Error in syntax_eval: {e}")
            return 0, "Error in syntax_eval: " + str(e)

    