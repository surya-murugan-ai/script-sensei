import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_all_extraction_results_returns_ai_extraction_data():
    # First, ensure there is at least one extraction result by uploading a prescription,
    # processing it with AI to generate extraction results.
    upload_url = f"{BASE_URL}/api/prescriptions/upload"
    process_url_template = f"{BASE_URL}/api/prescriptions/{{id}}/process"
    extraction_results_url = f"{BASE_URL}/api/extraction-results"
    delete_url_template = f"{BASE_URL}/api/prescriptions/{{id}}"

    headers = {}
    files = [
        ("files", (
            "test_prescription.jpg",
            b"\xFF\xD8\xFF\xE0" + b"\x00" * 1024,  # Minimal JPEG binary content with padding
            "image/jpeg"
        ))
    ]
    prescription_id = None
    try:
        # Step 1: Upload a prescription image to create a prescription resource
        upload_response = requests.post(
            upload_url,
            files=files,
            timeout=TIMEOUT,
            headers=headers
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        upload_data = upload_response.json()
        assert "prescriptionIds" in upload_data and isinstance(upload_data["prescriptionIds"], list)
        assert len(upload_data["prescriptionIds"]) > 0
        prescription_id = upload_data["prescriptionIds"][0]

        # Step 2: Process the uploaded prescription with AI to generate extraction results
        with open("test_prescription.jpg", "wb") as f:
            f.write(files[0][1][1])  # Write temp file for processing

        with open("test_prescription.jpg", "rb") as f:
            files_process = {"file": ("test_prescription.jpg", f, "image/jpeg")}
            process_response = requests.post(
                process_url_template.format(id=prescription_id),
                files=files_process,
                timeout=TIMEOUT,
                headers=headers
            )
        assert process_response.status_code == 200, f"AI processing failed: {process_response.text}"
        process_data = process_response.json()
        assert "extractedData" in process_data

        # Allow some time for extraction results to be persisted if async
        time.sleep(1.5)

        # Step 3: Call the extraction-results GET endpoint
        extraction_response = requests.get(extraction_results_url, timeout=TIMEOUT, headers=headers)
        assert extraction_response.status_code == 200, f"Failed to get extraction results: {extraction_response.text}"
        extraction_results = extraction_response.json()
        assert isinstance(extraction_results, list), "Extraction results is not a list"
        assert len(extraction_results) > 0, "Extraction results list is empty"

        # Validate each extraction result has id, model, and extractedData fields
        for result in extraction_results:
            assert isinstance(result, dict), "Extraction result item is not an object"
            assert "id" in result and isinstance(result["id"], str), "Missing or invalid 'id' in extraction result"
            assert "model" in result and isinstance(result["model"], str), "Missing or invalid 'model' in extraction result"
            assert "extractedData" in result and isinstance(result["extractedData"], dict), "Missing or invalid 'extractedData' in extraction result"

    finally:
        if prescription_id:
            # Cleanup: delete the uploaded prescription
            try:
                del_response = requests.delete(delete_url_template.format(id=prescription_id), timeout=TIMEOUT)
                assert del_response.status_code == 200, f"Failed to delete prescription {prescription_id}"
            except Exception:
                pass

test_get_all_extraction_results_returns_ai_extraction_data()
