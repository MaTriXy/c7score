import requests
from html_to_markdown import convert_to_markdown

# Gets snippets from llms.txt on context7
def scrape_context7_snippets(context7_url):
    response = requests.get(context7_url)
    snippets = convert_to_markdown(response.text)
    return snippets
