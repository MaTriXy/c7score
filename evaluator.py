import os
from dotenv import dotenv_values
from google import genai
import sys
import argparse
import requests
from bs4 import BeautifulSoup

config = dotenv_values(".env")

client = genai.Client(api_key=config["GEMINI_API_TOKEN"])

def evaluator(important_info, snippets):
    prompt = f"""Based on the important information, score how well the snippets reflect the important information.
    Your score should be between 0 and 10, with 0 being the worst and 10 being the best. The formatting does not matter,
    just grade based on the content. Only include your ONE score in the response, no other text.
    
    ----
    An example of a good score is:
    Important Information: TITLE: Installing 98.css via npm
    DESCRIPTION: This command-line instruction installs the 98.css package using npm,
    making it available for use in JavaScript projects or build systems. It's the 
    preferred method for integrating 98.css into modern web development workflows.
    SOURCE: https://github.com/jdan/98.css/blob/main/README.md#_snippet_1
    LANGUAGE: Shell
    CODE:
    ```
    npm install 98.css
    ```
    Snippets:     An example of a good score is:
    Important Information: TITLE: Installing 98.css via npm
    DESCRIPTION: This command-line instruction installs the 98.css package using npm,
    making it available for use in JavaScript projects or build systems. It's the 
    preferred method for integrating 98.css into modern web development workflows.
    SOURCE: https://github.com/jdan/98.css/blob/main/README.md#_snippet_1
    LANGUAGE: Shell
    CODE:
    ```
    npm install 98.css
    ```
    ---
    Important information: {important_info}
    Snippets: {snippets}
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash", contents=prompt
    )
    return response.text

def scrape_context7(url):
    snippets_url = "https://context7.com"
    context7_url = f"{snippets_url}/{url}/llms.txt"
    response = requests.get(context7_url)
    snippets = BeautifulSoup(response.text, "html.parser")
    return snippets


for file in os.listdir("important_info"):
    with open(f"important_info/{file}", "r") as info_file:
        info = info_file.read()
    formatted_url = file.replace("_", "/").split(".txt")[0]
    snippets = scrape_context7(formatted_url)

    ### Placeholder for better evaluation method ###
    score = evaluator(info, snippets)
    print(f"📊 Score for {formatted_url}: {score}")
    # print(f"🧹 Deleting important_info/{file}")
    # os.remove(f"important_info/{file}")
    print("--------------------------------")

    
