import requests
import json

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS = {
    "Accept": "application/json"
}

def test_retrieve_all_prescriptions_with_correct_data_structure():
    try:
        response = requests.get(f"{BASE_URL}/api/prescriptions", headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to get prescriptions failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        prescriptions = response.json()
    except json.JSONDecodeError:
        assert False, "Response is not valid JSON"

    assert isinstance(prescriptions, list), f"Expected a list of prescriptions, got {type(prescriptions)}"

    required_fields = {"id", "fileName", "fileSize", "uploadedAt", "createdAt", "processingStatus", "extractedData", "imageData"}
    for idx, prescription in enumerate(prescriptions):
        assert isinstance(prescription, dict), f"Prescription at index {idx} is not an object"
        keys = set(prescription.keys())
        missing = required_fields - keys
        assert not missing, f"Prescription at index {idx} is missing fields: {missing}"

        # Additional type checks for key fields
        assert isinstance(prescription["id"], str), f"Prescription id at index {idx} is not a string"
        assert isinstance(prescription["fileName"], str), f"fileName at index {idx} is not a string"
        assert isinstance(prescription["fileSize"], str), f"fileSize at index {idx} is not a string"
        assert isinstance(prescription["uploadedAt"], str), f"uploadedAt at index {idx} is not a string"
        assert isinstance(prescription["createdAt"], str), f"createdAt at index {idx} is not a string"
        assert isinstance(prescription["processingStatus"], str), f"processingStatus at index {idx} is not a string"
        assert isinstance(prescription["extractedData"], dict), f"extractedData at index {idx} is not an object"
        assert isinstance(prescription["imageData"], str), f"imageData at index {idx} is not a string"


test_retrieve_all_prescriptions_with_correct_data_structure()