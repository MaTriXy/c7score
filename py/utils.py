import requests
# from html_to_markdown import convert_to_markdown
import html2text
from bs4 import BeautifulSoup

# Gets snippets from llms.txt on context7
def scrape_context7_snippets(context7_url):
    response = requests.get(context7_url)
    snippets = response.text
    snippets = str(snippets)
    if len(snippets.split("redirected to this library: ")) > 1:
        new_url = f"https://context7.com{snippets.split('redirected to this library: ')[-1].rsplit('.', 1)[0]}/llms.txt"
        response = requests.get(new_url)
        final_snippets = str(response.text)
    else:
        final_snippets = snippets
    return final_snippets
