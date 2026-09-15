import json
from pathlib import Path

import pytest

from validation import ArtifactValidationError, validate_artifact


ROOT = Path(__file__).resolve().parents[2]
UIIR_SCHEMA = json.loads((ROOT / "packages/uiir/schema/uiir-0.2.0.schema.json").read_text(encoding="utf-8"))


VALID_UIIR = {
    "version": "0.2.0",
    "project": {"name": "fixture", "framework": "vite-react"},
    "product": {"name": "Fixture", "purpose": "Test UIIR", "audience": ["developers"]},
    "designSystem": {"id": "fixture", "tokens": {}},
    "screens": [
        {
            "id": "home",
            "name": "Home",
            "route": "/",
            "layout": "marketing",
            "regions": [],
        }
    ],
}


def test_valid_uiir_is_accepted() -> None:
    assert validate_artifact(json.dumps(VALID_UIIR), UIIR_SCHEMA, provider_name="test") == VALID_UIIR


def test_fenced_json_is_accepted() -> None:
    assert validate_artifact(f"```json\n{json.dumps(VALID_UIIR)}\n```", UIIR_SCHEMA, provider_name="test") == VALID_UIIR


def test_missing_required_field_is_rejected() -> None:
    invalid = dict(VALID_UIIR)
    invalid.pop("screens")
    with pytest.raises(ArtifactValidationError, match="screens"):
        validate_artifact(json.dumps(invalid), UIIR_SCHEMA, provider_name="test")


def test_unknown_top_level_field_is_rejected() -> None:
    invalid = {**VALID_UIIR, "unexpected": True}
    with pytest.raises(ArtifactValidationError, match="unexpected"):
        validate_artifact(json.dumps(invalid), UIIR_SCHEMA, provider_name="test")


def test_version_mismatch_is_rejected() -> None:
    invalid = {**VALID_UIIR, "version": "0.1.0"}
    with pytest.raises(ArtifactValidationError, match="0.2.0"):
        validate_artifact(json.dumps(invalid), UIIR_SCHEMA, provider_name="test")


def test_oversized_response_is_rejected() -> None:
    oversized = "{" + "x" * 256_001 + "}"
    with pytest.raises(ArtifactValidationError, match="size limit"):
        validate_artifact(oversized, UIIR_SCHEMA, provider_name="test")
