import requests
# from html_to_markdown import convert_to_markdown
import html2text
from bs4 import BeautifulSoup

# Gets snippets from llms.txt on context7
def scrape_context7_snippets(context7_url):
    response = requests.get(context7_url)
    snippets = response.text

    return str(snippets)
