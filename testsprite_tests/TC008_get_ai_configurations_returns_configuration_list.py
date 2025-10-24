import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_ai_configurations_returns_configuration_list():
    url = f"{BASE_URL}/api/configs"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    try:
        configs = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(configs, list), "Response JSON is not a list"

    for config in configs:
        assert isinstance(config, dict), "Each configuration should be a dictionary"
        assert "id" in config and isinstance(config["id"], str), "Config missing string 'id'"
        assert "selectedModels" in config and isinstance(config["selectedModels"], list), "Config missing list 'selectedModels'"
        for model in config["selectedModels"]:
            assert isinstance(model, str), "'selectedModels' items must be strings"
        assert "isDefault" in config and isinstance(config["isDefault"], bool), "Config missing boolean 'isDefault'"

test_get_ai_configurations_returns_configuration_list()