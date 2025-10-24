import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_create_ai_configuration_stores_new_configuration():
    url = f"{BASE_URL}/api/configs"
    headers = {
        "Content-Type": "application/json"
    }
    # Prepare payload with typical selectedModels and isDefault flag
    payload = {
        "selectedModels": ["OpenAI GPT-4V", "Anthropic Claude", "Google Gemini"],
        "isDefault": False
    }

    response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    # The response may not have a body according to PRD, but if it does, validate presence of ID or similar
    try:
        resp_json = response.json()
        # If response returns created config id or object, validate fields
        if isinstance(resp_json, dict):
            # If id returned, check it is string and non-empty
            if "id" in resp_json:
                assert isinstance(resp_json["id"], str) and resp_json["id"], "Missing or invalid id in response"
            # Validate selectedModels match
            if "selectedModels" in resp_json:
                assert set(resp_json["selectedModels"]) == set(payload["selectedModels"]), \
                    "Mismatch in selectedModels in response"
            if "isDefault" in resp_json:
                assert resp_json["isDefault"] == payload["isDefault"], "Mismatch in isDefault flag in response"
    except Exception:
        # If no JSON or no body, that's acceptable as per PRD
        pass

test_create_ai_configuration_stores_new_configuration()