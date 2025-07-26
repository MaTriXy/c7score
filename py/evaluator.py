from linter import *
import tempfile
from pydantic import BaseModel
import json

class Evaluator:
    """Evaluates the quality of the snippets"""
    
    def __init__(self, client: str, snippets: str):
        self.client = client
        self.snippets = snippets

    def split_snippets(self):
        return self.snippets.split("\n" + "-" * 40 + "\n")
    
    def access_category(self, snippet: str, category):
        okay = ["TITLE:", "DESCRIPTION:", "SOURCE:"]
        if category in okay:
            for line in snippet.splitlines():
                if line.startswith(category):
                    return line.split(category)[-1].split("\n")[0]
        else:
            return snippet.split(f"{category}:")

    # Evaluates relevancy and correctness of snippets
    def llm_evaluate(self):
        snippet_del = "\n" + "-" * 40 + "\n"
        prompt = f"""For each criterion, provide
        a score between 0 and 100, where 0 is the   
        criterion was not met at all, 50 is the criterion 
        was partially met, and 100 is the criterion was fully met
        with no room for improvement.
        The snippets are separated by 
        {snippet_del}
        and the code blocks are enclosed in ```.
        Your scores should represent a ratio of how many
        snippets meet the criterion out of the total number of snippets.
        The maximum possible total score is 300 and the minimum is 0.
        
        Criteria:
        1. Unique Information (30%): Snippets contain unique information that is not already included in 
        another snippet. There can be some overlap, but the snippets should not be identical.
        2. Clarity (30%): There are no snippets that are confusingly worded or unclear. This could be grammatical 
        or spelling errors. Titles and descriptions are sensible (e.g., the description shouldn't be about requests 
        when the code is about visualizing data) and all the text, even in the code snippets, are in English.
        3. Correct Syntax (40%): No snippets contain any obvious syntax errors. Snippets are formatted in such a way 
        that you can easily isolate the code (e.g., no placeholders or ellipses). The programming language of 
        the code snippet is correct.

        Return only the JSON object with this schema:
        {{
            "scores": [int, ..., int],  # Has length of 3, each element is a score between 0 and 10
            "total_score": int,  # total of scores, between 0 and 300
            "explanation": str  # Explanation for EACH score, separated by newlines, 3 explanations in total.
        }}
        Snippets: {self.snippets}
        """
        class Scores(BaseModel):
            scores: list[int]
            total_score: int
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
                total_score = json_response["total_score"]
                explanation = json_response["explanation"]

                # Returns thorough breakdown of scores, sum of scores
                return scores, total_score, explanation
            
            except Exception as e:
                print(f"Error: {e}")
                return [-1] * 3, -1, "There was an error during LLM evaluation: " + str(e)
        else:
            print("Prompt is too long, skipping LLM evaluation")
            return [-1] * 3, -1, "Prompt is too long, skipped LLM evaluation"


    def formatting(self):
        """Check if the snippets are formatted correctly"""
        try:
            comp = ["TITLE: ", "DESCRIPTION: ", "LANGUAGE: ", "SOURCE: ", "CODE:"]
            snippets_list = self.split_snippets()
            improper_formatting = 0

            for snippet in snippets_list:
                codes = self.access_category(snippet, "CODE")
                lang_snippet = self.access_category(snippet, "LANGUAGE")

                # Tests
                missing_info = not all(c in snippet for c in comp)
                short_code = any(
                    len([token for token in code.split("CODE:")[-1].replace("```", "").strip().replace("\n", " ").split(" ") 
                    if token.strip()]) < 5 
                    for code in codes)
                multiple_code_snippets = len(snippet.split("CODE:")) > 2 or len(snippet.split("LANGUAGE:")) > 2
                description_for_lang = any(
                    (("none" in l.split("\nCODE:")[0].strip().lower() or "console" in l.split("\nCODE:")[0].strip().lower()))
                    for l in lang_snippet
                    if "code:\n```" in l)
                contains_list = (
                    # Check for both 1. and 2. to make sure its a numbered list and not something else
                    any("◯" in code.split("CODE:")[-1].strip().strip("`") for code in codes)
                    or any(("1. " and "2. ") in code.split("CODE:")[-1].strip().strip("`") for code in codes))

                if any([missing_info, short_code, multiple_code_snippets, description_for_lang, contains_list]):
                    improper_formatting += 1
            return ((len(snippets_list) - improper_formatting) / len(snippets_list)) * 10, ""
        
        except Exception as e:
            print(f"Error in formatting: {e}")
            return -1, "Error in formatting: " + str(e)
        
    def project_metadata(self):
        """Check if the snippets contain project metadata"""
        try:
            snippets_list = self.split_snippets()
            project_metadata = 0

            for snippet in snippets_list:
                lang_snippet = self.access_category(snippet, "LANGUAGE")
                source = self.access_category(snippet, "SOURCE:")
                title = self.access_category(snippet, "TITLE:")
                codes = self.access_category(snippet, "CODE")

                # Tests
                bibtex_citations = any(
                    ("bibtex" in l.split("\nCODE:")[0].strip().lower())
                    for l in lang_snippet
                    if "CODE:\n```" in l
                )
                license_info = "license" in source.lower()
                directory_structure = (any(t in title.lower() for t in ["directory", "structure", "workflow"])
                    and any(shape in code.split("CODE:")[-1].strip().strip("`") for code in codes for shape in ["├─", "└─", "|-"]))

                if any([bibtex_citations, license_info, directory_structure]):
                    project_metadata += 1
            return ((len(snippets_list) - project_metadata) / len(snippets_list)) * 10, ""

        except Exception as e:
            print(f"Error in project_metadata: {e}")
            return -1, "Error in project_metadata: " + str(e)
        
    
    def initialization(self):
        """Check if the snippets contain information about initialization"""
        try:
            snippets_list = self.split_snippets()
            initialization_check = 0
            for snippet in snippets_list:
                title = self.access_category(snippet, "TITLE:")
                codes = self.access_category(snippet, "CODE")
                imports = (
                    any(t in title.lower() for t in ["import", "importing"])  # Title contains keywords
                    and any(code.split("CODE:")[-1].strip().strip("`").count("\n") == 2 for code in codes)  # Code is a single line
                    and any("/" not in code.split("CODE:")[-1].strip().strip("`") for code in codes)  # Code contains a path
                )
                installs = (
                    any(t in title.lower() for t in ["install", "initialize", "initializing"])  # Title contains keywords
                    and any(code.split("CODE:")[-1].strip().strip("`").count("\n") == 2 for code in codes)  # Code is a single line
                )
                if any([imports, installs]):
                    initialization_check += 1
            return ((len(snippets_list) - initialization_check) / len(snippets_list)) * 10, ""
        except Exception as e:
            print(f"Error in initialization: {e}")
            return -1, "Error in initialization: " + str(e)
 