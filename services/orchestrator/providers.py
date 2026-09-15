import json
import os
from dataclasses import dataclass
from typing import Any, Protocol

import httpx


class ProviderError(RuntimeError):
    pass


class ModelProvider(Protocol):
    name: str
    model: str

    async def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class ProviderConfig:
    provider: str
    model: str
    api_key: str
    base_url: str | None = None


def _json_object(text: str) -> dict[str, Any]:
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ProviderError("Provider returned invalid JSON") from exc
    if not isinstance(value, dict):
        raise ProviderError("Provider returned a JSON value instead of an object")
    return value


class OpenAICompatibleProvider:
    def __init__(self, config: ProviderConfig, *, name: str) -> None:
        self.name = name
        self.model = config.model
        self.api_key = config.api_key
        self.base_url = (config.base_url or "https://api.openai.com/v1").rstrip("/")

    async def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderError(f"{self.name} request failed") from exc
        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"{self.name} returned an unexpected response") from exc
        return _json_object(content)


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, config: ProviderConfig) -> None:
        self.model = config.model
        self.api_key = config.api_key
        self.base_url = (config.base_url or "https://api.anthropic.com").rstrip("/")

    async def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        payload = {"model": self.model, "max_tokens": 4096, "system": system, "messages": [{"role": "user", "content": user}]}
        headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(f"{self.base_url}/v1/messages", headers=headers, json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderError("Anthropic request failed") from exc
        try:
            text = response.json()["content"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError("Anthropic returned an unexpected response") from exc
        return _json_object(text)


class GeminiProvider:
    name = "gemini"

    def __init__(self, config: ProviderConfig) -> None:
        self.model = config.model
        self.api_key = config.api_key
        self.base_url = (config.base_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

    async def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json", "responseSchema": schema},
        }
        headers = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(f"{self.base_url}/models/{self.model}:generateContent", headers=headers, json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderError("Gemini request failed") from exc
        try:
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError("Gemini returned an unexpected response") from exc
        return _json_object(text)


def provider_from_env() -> ModelProvider:
    provider = os.getenv("ARQEN_PROVIDER", "openrouter").lower()
    model = os.getenv("ARQEN_MODEL", "openai/gpt-4o-mini")
    if provider == "openrouter":
        key = os.getenv("OPENROUTER_API_KEY", "")
        if not key: raise ProviderError("OPENROUTER_API_KEY is not configured")
        return OpenAICompatibleProvider(ProviderConfig(provider, model, key, os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")), name="openrouter")
    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY", "")
        if not key: raise ProviderError("OPENAI_API_KEY is not configured")
        return OpenAICompatibleProvider(ProviderConfig(provider, model, key), name="openai")
    if provider == "local":
        key = os.getenv("ARQEN_LOCAL_API_KEY", "local")
        return OpenAICompatibleProvider(ProviderConfig(provider, model, key, os.getenv("ARQEN_LOCAL_BASE_URL", "http://localhost:11434/v1")), name="local")
    if provider == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY", "")
        if not key: raise ProviderError("ANTHROPIC_API_KEY is not configured")
        return AnthropicProvider(ProviderConfig(provider, model, key, os.getenv("ANTHROPIC_BASE_URL")))
    if provider == "gemini":
        key = os.getenv("GEMINI_API_KEY", "")
        if not key: raise ProviderError("GEMINI_API_KEY is not configured")
        return GeminiProvider(ProviderConfig(provider, model, key, os.getenv("GEMINI_BASE_URL")))
    raise ProviderError(f"Unsupported ARQEN_PROVIDER: {provider}")
