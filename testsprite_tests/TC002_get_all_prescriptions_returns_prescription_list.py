import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_all_prescriptions_returns_prescription_list():
    url = f"{BASE_URL}/api/prescriptions"
    headers = {
        "Accept": "application/json",
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        prescriptions = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(prescriptions, list), "Response should be a list"

    for pres in prescriptions:
        assert isinstance(pres, dict), "Each prescription should be a dict"
        assert "id" in pres, "Prescription missing 'id' field"
        assert isinstance(pres["id"], str), "'id' should be a string"
        assert "processingStatus" in pres, "Prescription missing 'processingStatus' field"
        assert isinstance(pres["processingStatus"], str), "'processingStatus' should be a string"
        assert "createdAt" in pres, "Prescription missing 'createdAt' field"
        assert isinstance(pres["createdAt"], str), "'createdAt' should be a string"

test_get_all_prescriptions_returns_prescription_list()