import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from providers import ProviderError, provider_from_env

load_dotenv()

app = FastAPI(title="ARQEN Orchestrator", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ARQEN_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


class DesignRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=8000)


UIIR_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "version": {"type": "string"},
        "project": {"type": "object", "properties": {"name": {"type": "string"}, "framework": {"type": "string"}}, "required": ["name", "framework"]},
        "product": {"type": "object", "properties": {"name": {"type": "string"}, "purpose": {"type": "string"}, "audience": {"type": "array", "items": {"type": "string"}}}, "required": ["name", "purpose", "audience"]},
        "designSystem": {"type": "object", "properties": {"id": {"type": "string"}, "tokens": {"type": "object"}}, "required": ["id", "tokens"]},
        "screens": {"type": "array", "items": {"type": "object"}},
    },
    "required": ["version", "project", "product", "designSystem", "screens"],
}

SYSTEM_PROMPT = """You are ARQEN's design intelligence model interface. ARQEN is not a general coding agent. Return a structured UIIR proposal only. Think about product context, hierarchy, reusable components, responsive behavior, states and accessibility. Do not emit implementation code. The artifact will be validated and rendered by deterministic systems."""


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "arqen-orchestrator", "version": "0.2.0"}


@app.post("/v1/design")
async def design(request: DesignRequest) -> dict[str, Any]:
    try:
        provider = provider_from_env()
        result = await provider.generate_json(system=SYSTEM_PROMPT, user=request.prompt, schema=UIIR_SCHEMA)
        return {"uiir": result, "provider": provider.name, "model": provider.model}
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/build")
async def build_compat(request: DesignRequest) -> dict[str, Any]:
    """Compatibility alias for the early studio; new clients should use /v1/design."""
    return await design(request)
