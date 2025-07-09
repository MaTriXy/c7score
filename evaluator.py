import requests
from bs4 import BeautifulSoup
from llms_txt import *

class Evaluator:
    def __init__(self, filename, client):
        self.filename = filename
        self.client = client

    def scrape_context7(self):
        snippets_url = "https://context7.com"
        context7_url = f"{snippets_url}/{self.filename}/llms.txt"
        response = requests.get(context7_url)
        soup = BeautifulSoup(response.text, "html.parser")
        snippets = soup.get_text()
        return snippets

    def evaluate(self, important_info, snippets):
        prompt = f"""For each criterion, provide
        a score between 0 and 10, with 0 being 
        the worst and 10 being the best. Also include 
        a short explanation for each score, and an 
        average of them. Each criterion
        compares the required information with the snippets.
        The snippets are separated by 
        ---------------------------------------- 
        and the code blocks are enclosed in ```.
        
        
        Criteria:
        1. The snippets include some variation of all the required information.
        2. Snippets contain unique information that is not already included in another snippet.
        3. The snippets do not contain general information that is unhelpful for coding (e.g., 
        library's license, development setup, file structure).
        4. There are no snippets that are confusingly worded or unclear.
        5. No snippets contain syntax errors.
        6. Snippets are formatted in such a way that you can easily isolate the code.
        7. Titles and descriptions are sensible.
        8. The programming language of the code snippet correct?

        Required information: {important_info}
        Snippets: {snippets}
        """
        response = self.client.models.generate_content(
            model="gemini-2.5-pro", contents=prompt
        )
        return response
