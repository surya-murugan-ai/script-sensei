import requests

BASE_URL = "http://localhost:5000"
EXTRACTION_RESULTS_ENDPOINT = f"{BASE_URL}/api/extraction-results"
TIMEOUT = 30

def test_get_all_extraction_results_with_correct_schema():
    try:
        response = requests.get(EXTRACTION_RESULTS_ENDPOINT, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

        extraction_results = response.json()
        assert isinstance(extraction_results, list), "Response is not a list"

        required_fields = {
            "id": str,
            "prescriptionId": str,
            "modelName": str,
            "fieldName": str,
            "extractedValue": str,
            "confidence": (int, float),
            "processingTime": (int, float),
            "createdAt": str,
        }

        for result in extraction_results:
            assert isinstance(result, dict), "Extraction result item is not a dict"
            for field, field_type in required_fields.items():
                assert field in result, f"Field '{field}' missing in extraction result"
                # Allow confidence and processingTime to be int or float
                if isinstance(field_type, tuple):
                    assert isinstance(result[field], field_type), f"Field '{field}' is not of type {field_type}"
                else:
                    assert isinstance(result[field], field_type), f"Field '{field}' is not of type {field_type}"

    except requests.exceptions.RequestException as e:
        assert False, f"Request to {EXTRACTION_RESULTS_ENDPOINT} failed: {e}"

test_get_all_extraction_results_with_correct_schema()