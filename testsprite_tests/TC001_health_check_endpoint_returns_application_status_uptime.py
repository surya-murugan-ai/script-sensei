import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_health_check_endpoint_returns_application_status_uptime():
    url = f"{BASE_URL}/api/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, dict), "Response JSON is not an object"
    assert "status" in data, "'status' field missing from response"
    assert isinstance(data["status"], str), "'status' is not a string"
    assert "timestamp" in data, "'timestamp' field missing from response"
    assert isinstance(data["timestamp"], str), "'timestamp' is not a string"
    assert "uptime" in data, "'uptime' field missing from response"
    assert isinstance(data["uptime"], (int, float)), "'uptime' is not a number"
    assert data["uptime"] >= 0, "'uptime' should be non-negative"

test_health_check_endpoint_returns_application_status_uptime()