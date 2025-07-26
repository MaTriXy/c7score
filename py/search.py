from google.genai import types
from pydantic import BaseModel
import requests
from urllib.parse import quote
import json

class Search:
    def __init__(self, library: str, client: str):
        self.library = library
        self.client = client

    # Determines relevant information using Google search of library + provided URL
    def generate_questions(self) -> str:
        """Generates 15 questions based on the library"""
        prompt = f"""
        Generate 15 questions, 10 of which should be common and practical 
        questions that developers frequently ask when using the library {self.library}. 
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

        Example format:
        1. "Show me how to build a card component with shadow, hover effects, and truncated text in {self.library}"
        2. "How to create a responsive navigation bar with dropdown menus in {self.library}"

        """
        # Google Search tool
        search_tool = types.Tool(google_search=types.GoogleSearch())
        model_config = types.GenerateContentConfig(tools=[search_tool])

        response = self.client.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt,
            config=model_config
        ).text

        return response

    def generate_search_topics(self, questions: str) -> list[list[str]]:
        """Generates 4-5 search topics for each question"""

        prompt = f"""
        For each question about {self.library}, generate 5 relevant search topics 
        as comma-separated keywords/phrases. These topics should help find the most 
        relevant documentation and code examples.

        Questions: "{questions}"

        Your response should be formatted as a list of 15 elements, representing 
        each question, where each element is a list of 5 search topics. 

        Example output format: [["card components", "box shadow", "hover effects", "text truncation", "transition utilities"],
                                ["responsive navigation", "dropdown menus", "navigation bar", "responsive design", "navigation patterns"],
                                ...]
        """
        class Topics(BaseModel):
            topics: list[list[str]]

        response = self.client.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt,
            config={"response_mime_type": "application/json",
                    "response_schema": Topics}
        ).text
        json_response = json.loads(response)

        return json_response["topics"]
    
    def fetch_context(self, topics, library) -> list[list[str]]:
        """Gets the context/code snippets per topic for the library"""
        contexts = []  # 15 x 5 = 75 contexts

        for question_topics in topics:  # total of 15 questions
            question_contexts = []  # 5 contexts per question
            for topic in question_topics:  # total of 5 topics per question
                topic_url = quote(topic, safe="")
                url = f"https://context7.com{library}/llms.txt?tokens=10000&topic={topic_url}"
                headers = {"Accept-Encoding": "identity"}
                response = requests.get(url, headers=headers)
                question_contexts.append(response.text)
            contexts.append(question_contexts)
        return contexts
    
    def evaluate_context(self, questions: str, context: list[list[str]]) -> tuple[list[int], list[str]]:
        prompt = f"""
        You are evaluating documentation context for its quality and relevance in helping an AI 
        coding assistant answer the following question:

        Questions: "{questions}"

        Contexts ({context}):

        For each question, evaluate and score the context from 0-100 based on the following criteria:
        1. Relevance to the specific question (40%)
        2. Code example quality and completeness (25%)
        3. Practical applicability (15%)
        4. Coverage of requested features (15%)
        5. Clarity and organization (5%)

        Your response should contain two lists and one average score. The first list represents the scores for each question,
        and should have 15 elements. The second list represents the correspond explanations for each score,
        and should also have 15 elements.

        Example output format:
        [80, 75, 90, 65, 85, 70, 95, 60, 80, 75, 90, 65, 85, 70, 95],
        ["The context completely answers the question.",
         ...]
        """

        class Score(BaseModel):
            scores: list[int]
            explanation: list[str]
            average: int

        response = self.client.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt,
            config={"response_mime_type": "application/json",
                    "response_schema": Score}
        ).text

        json_response = json.loads(response)
        return json_response["scores"], json_response["average"], json_response["explanation"]