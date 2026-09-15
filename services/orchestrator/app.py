import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Arqen Orchestrator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BuildRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=8000)


SYSTEM_PROMPT = """You are Arqen's Design Intelligence Engine.
Understand the product before generating implementation code.
For a product request, return ONLY valid JSON with this shape:
{
  \"product\": {\"name\": string, \"purpose\": string, \"audience\": string[]},
  \"screens\": [{\"id\": string, \"name\": string, \"route\": string, \"layout\": \"app\"|\"marketing\"|\"auth\"|\"settings\", \"regions\": [{\"id\": string, \"type\": \"header\"|\"content\"|\"aside\"|\"footer\", \"layout\": \"stack\"|\"grid\"|\"split\", \"components\": [{\"id\": string, \"component\": string, \"props\": object, \"responsive\": object, \"state\": string}]}]}],
  \"theme\": {\"id\": \"arqen-light\"}
}
Use only these component types: PageHeader, MetricGrid, MetricCard, DataTable, Form, Button, Input, Select, Card, EmptyState, Alert, Dialog, ActivityList, Chart, Text.
Create a coherent small product, not a generic template. Keep the first result practical and editable.
"""


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "arqen-orchestrator"}


@app.post("/build")
async def build(request: BuildRequest) -> dict[str, Any]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("ARQEN_MODEL", "openai/gpt-4o-mini")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY is not configured")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "Arqen"),
    }

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return {"uiir": json.loads(content), "model": model}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Model provider error: {exc.response.text[:500]}") from exc
    except (KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Model returned an invalid UIIR response") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach model provider") from exc
