from typing import List
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re
from pydantic import BaseModel, Field, ValidationError
from datetime import datetime, timedelta
import calendar
import pytz
import random

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=api_key,
)

PROMPT_TEMPLATE = """Analyze these energy parameters and provide textual recommendations:

Input Data:
Location: {location}
Solar: {panel_data}
Weather: {weather_data}
Devices: {devices}

Return a textual response with energy-saving suggestions."""


async def get_recommendations(request):
    try:
        prompt = PROMPT_TEMPLATE.format(
            panel_data=str(request.solar_panel_data) if request.solar_panel_data else "No solar panel data available",
            weather_data="\n\n".join(
                str(w) for w in request.weather_data) if request.weather_data else "No weather data available",
            devices="\n".join(str(d) for d in request.devices) if request.devices else "No devices available",
            location=str(request.location)
        )

        # Note: You may need to adjust the model and API endpoint based on your actual setup
        completion = client.chat.completions.create(
            extra_body={},
            model="deepseek/deepseek-chat:free",  # Use an appropriate model
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return completion.choices[0].message.content

    except Exception as e:
        return {"error": f"Failed to retrieve response: {str(e)}"}