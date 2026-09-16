import json
from pathlib import Path

import pytest

from reasoning import Finding, RecommendationRequest, normalize_recommendations
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


def recommendation_request(risk: str = "low") -> RecommendationRequest:
    return RecommendationRequest(findings=[Finding(
        id="accessibility:image-alt:1",
        category="accessibility",
        severity="high",
        confidence=0.93,
        risk=risk,
        title="Images may be missing alternative text",
        evidence=["1 img element lacks alt"],
        affected_files=["src/App.tsx"],
        potential_fixes=["Add certain alt text"],
    )])


def recommendation(**overrides: object) -> dict:
    value = {
        "findingId": "accessibility:image-alt:1",
        "priority": "high",
        "rationale": "The source evidence indicates a missing accessible name.",
        "proposedChange": "Add an appropriate alt attribute.",
        "affectedFiles": ["src/App.tsx"],
        "safeToAutomate": False,
    }
    value.update(overrides)
    return {"summary": "Prioritized accessibility work.", "recommendations": [value]}


def test_unknown_finding_id_is_rejected_after_schema_validation() -> None:
    value = recommendation(findingId="missing:1")
    with pytest.raises(ValueError, match="unknown finding ID"):
        normalize_recommendations(value, recommendation_request())


def test_unknown_affected_file_is_rejected() -> None:
    value = recommendation(affectedFiles=["src/NotInFinding.tsx"])
    with pytest.raises(ValueError, match="not attached"):
        normalize_recommendations(value, recommendation_request())


def test_high_risk_finding_cannot_be_marked_safe_to_automate() -> None:
    value = recommendation(safeToAutomate=True)
    with pytest.raises(ValueError, match="High-risk"):
        normalize_recommendations(value, recommendation_request(risk="high"))


def test_normalization_bounds_confidence_and_preserves_evidence() -> None:
    value = recommendation(confidence=1.0, evidence=["model evidence"])
    result = normalize_recommendations(value, recommendation_request())
    assert result["recommendations"][0]["confidence"] == 1.0
    assert result["recommendations"][0]["evidence"] == ["model evidence"]
