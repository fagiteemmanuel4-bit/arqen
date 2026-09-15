import json
import re
from typing import Any

from jsonschema import Draft202012Validator, SchemaError


MAX_PROVIDER_RESPONSE_BYTES = 256_000


class ArtifactValidationError(ValueError):
    pass


def _extract_json_object(text: str) -> dict[str, Any]:
    if not isinstance(text, str):
        raise ArtifactValidationError("Provider content is not text")
    if len(text.encode("utf-8")) > MAX_PROVIDER_RESPONSE_BYTES:
        raise ArtifactValidationError("Provider response exceeds the configured size limit")

    cleaned = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, flags=re.IGNORECASE | re.DOTALL)
    if fenced:
        cleaned = fenced.group(1).strip()

    decoder = json.JSONDecoder()
    try:
        value, end = decoder.raw_decode(cleaned)
    except json.JSONDecodeError:
        # Some providers prepend a short explanation despite being asked for JSON.
        start = cleaned.find("{")
        if start < 0:
            raise ArtifactValidationError("Provider returned no JSON object")
        try:
            value, end = decoder.raw_decode(cleaned[start:])
        except json.JSONDecodeError as exc:
            raise ArtifactValidationError("Provider returned invalid JSON") from exc

    if cleaned[end:].strip() and not cleaned[:end].strip().startswith("{"):
        # When JSON was recovered from surrounding text, trailing prose is tolerated.
        pass
    if not isinstance(value, dict):
        raise ArtifactValidationError("Provider returned a JSON value instead of an object")
    return value


def validate_artifact(text: str, schema: dict[str, Any], *, provider_name: str) -> dict[str, Any]:
    try:
        validator = Draft202012Validator(schema)
        errors = sorted(validator.iter_errors(_extract_json_object(text)), key=lambda error: list(error.path))
    except SchemaError as exc:
        raise ArtifactValidationError("ARQEN contains an invalid artifact schema") from exc

    if errors:
        first = errors[0]
        path = ".".join(str(part) for part in first.absolute_path) or "$"
        raise ArtifactValidationError(f"{provider_name} returned schema-invalid output at {path}: {first.message}")

    return _extract_json_object(text)
