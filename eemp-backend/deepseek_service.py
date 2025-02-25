from typing import List, Dict
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re
from pydantic import BaseModel, Field, ValidationError

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=api_key,
)

PROMPT_TEMPLATE = """Analyze these energy parameters and provide JSON recommendations:
{{
  "recommendations": [
    {{
      "title": "short title",
      "suggestion": "concrete advice",
      "savings_predictions": ["specific metric 1", "specific metric 2 (optional)", "specific metric 3 (optional)"],
      "efficiency": {{
        "daily": 5.5,
        "monthly": 15
      }}
    }}
  ]
}}

Input Data:
Location: {location}
Solar: {panel_data}
Weather: {weather_data}
Devices: {devices}

Return ONLY VALID JSON following the example format. Use numbers between 0-100 for daily and monthly efficiency percentages (no % symbol). Do not add explanations."""


class Efficiency(BaseModel):
    daily: float = Field(..., ge=0, le=100, description="Daily energy savings percentage")
    monthly: float = Field(..., ge=0, le=100, description="Monthly energy savings percentage")


class SavingsPrediction(BaseModel):
    title: str = Field(..., max_length=40)
    suggestion: str = Field(..., max_length=180)
    savings_predictions: List[str] = Field(..., min_items=1, max_items=3)
    efficiency: Efficiency  # Now using numeric values


class RecommendationResponse(BaseModel):
    recommendations: List[SavingsPrediction] = Field(..., min_items=1, max_items=10)


async def get_recommendations(request):
    try:
      prompt = PROMPT_TEMPLATE.format(
        panel_data=str(request.solar_panel_data),
        weather_data="\n\n".join(str(w) for w in request.weather_data),
        devices="\n".join(str(d) for d in request.devices),
        location=str(request.location)
      )
      completion = client.chat.completions.create(
        extra_body={},
        model="deepseek/deepseek-chat:free",
        messages=[
          {
            "role": "user",
            "content": prompt
          }
        ]
      )

      # Extract JSON from response using regex
      raw_response = completion.choices[0].message.content
      json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)

      if not json_match:
        await get_recommendations(request)

      json_str = json_match.group(0)
      parsed = RecommendationResponse.model_validate_json(json_str)
      return parsed

    except (json.JSONDecodeError, ValidationError) as e:
        return {"error": f"Invalid JSON response from API: {str(e)}"}