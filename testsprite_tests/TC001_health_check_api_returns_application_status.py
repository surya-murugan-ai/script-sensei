import requests
from datetime import datetime

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_health_check_api_returns_application_status():
    url = f"{BASE_URL}/api/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with exception: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    json_data = response.json()
    # Validate presence of keys
    assert "status" in json_data, "'status' key not in response"
    assert "timestamp" in json_data, "'timestamp' key not in response"
    assert "uptime" in json_data, "'uptime' key not in response"

    # Validate status value
    assert isinstance(json_data["status"], str), "'status' should be a string"
    # Example value from PRD: "healthy"
    assert json_data["status"].lower() == "healthy", f"Expected status 'healthy', got '{json_data['status']}'"

    # Validate timestamp is ISO 8601 date-time string parseable by datetime.fromisoformat
    timestamp = json_data["timestamp"]
    try:
        parsed_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except Exception as e:
        assert False, f"Timestamp '{timestamp}' is not a valid ISO 8601 date-time string: {e}"

    # Validate uptime is a number (int or float) and positive
    uptime = json_data["uptime"]
    assert isinstance(uptime, (int, float)), f"'uptime' should be a number, got {type(uptime)}"
    assert uptime >= 0, "'uptime' should be non-negative"

test_health_check_api_returns_application_status()