"""
Python parity demo — same recipe as hello-agent.ts, just Python ADK.
Presenter-only: shows Python-preferring participants the equivalent path
if they ask "does this work in Python too?"

pip install google-adk litellm

Model toggle — same idea as pickModel() in the TS files, uncomment ONE.
"""
import asyncio

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.adk.models.lite_llm import LiteLlm
from google.genai import types

model = "gemini-flash-latest"  # ADK default — needs GOOGLE_GENAI_API_KEY env var

# LiteLlm reaches Claude, OpenAI, or 100+ other providers — Python ADK's
# built-in equivalent of what Kitana does on the TS side. Important
# difference: LiteLlm always needs a REAL API key (ANTHROPIC_API_KEY env
# var below) — unlike Kitana, it has no way to shell out to your `claude`
# CLI subscription. No key, no CLI-subscription bypass, in Python.
# model = LiteLlm(model="anthropic/claude-sonnet-4-6")

agent = LlmAgent(
    name="hello",
    model=model,
    instruction="You are a friendly assistant. Answer briefly and to the point.",
)


async def main():
    runner = InMemoryRunner(agent=agent, app_name="workshop")
    session = await runner.session_service.create_session(app_name="workshop", user_id="user")
    message = types.Content(role="user", parts=[types.Part(text="Tell a very short story about a cat")])

    async for event in runner.run_async(user_id="user", session_id=session.id, new_message=message):
        if event.content and event.content.parts and event.content.parts[0].text:
            print(event.content.parts[0].text, end="")
    print()


if __name__ == "__main__":
    asyncio.run(main())
