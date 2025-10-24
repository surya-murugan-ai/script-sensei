import requests
import io

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_process_prescription_with_ai_returns_extracted_data():
    session = requests.Session()
    prescription_id = None
    try:
        # Step 1: Upload a prescription image to get a prescription ID
        upload_url = f"{BASE_URL}/api/prescriptions/upload"
        # Use a small valid sample prescription image content (PNG header with minimal data)
        sample_image_content = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\nIDATx\xdacd\xf8\x0f\x00\x01\x01\x01\x00"
            b"\x18\xdd\x8d\xe2\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {'files': ('prescription.png', io.BytesIO(sample_image_content), 'image/png')}
        upload_resp = session.post(upload_url, files=files, timeout=TIMEOUT)
        assert upload_resp.status_code == 200, f"Upload failed with status {upload_resp.status_code}"
        upload_json = upload_resp.json()
        assert "prescriptionIds" in upload_json and isinstance(upload_json["prescriptionIds"], list)
        assert len(upload_json["prescriptionIds"]) > 0
        prescription_id = upload_json["prescriptionIds"][0]

        # Step 2: Process the uploaded prescription using AI
        process_url = f"{BASE_URL}/api/prescriptions/{prescription_id}/process"
        # The API expects multipart/form-data with a file field
        files = {'file': ('prescription.png', io.BytesIO(sample_image_content), 'image/png')}
        process_resp = session.post(process_url, files=files, timeout=TIMEOUT)
        assert process_resp.status_code == 200, f"Processing failed with status {process_resp.status_code}"
        process_json = process_resp.json()
        assert "message" in process_json and isinstance(process_json["message"], str)
        assert process_json["message"].lower() in ("processing completed", "success", "processed")
        assert "extractedData" in process_json and isinstance(process_json["extractedData"], dict)
        extracted_data = process_json["extractedData"]
        # Basic validation of extracted data structure (must have patient, medication, investigations or doctor entries)
        keys = extracted_data.keys()
        assert any(k in keys for k in ("patient", "medication", "investigations", "doctor")), \
            "Extracted data missing expected keys"

        # Step 3: Validate that status is updated in DB by retrieving prescription details
        get_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
        get_resp = session.get(get_url, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get prescription failed with status {get_resp.status_code}"
        get_json = get_resp.json()
        # Verify processingStatus is either completed or similar
        assert "processingStatus" in get_json and isinstance(get_json["processingStatus"], str)
        assert get_json["processingStatus"].lower() in ("completed", "processed", "done")
        # Check extractedData persistence matches response extractedData keys at least
        assert "extractedData" in get_json and isinstance(get_json["extractedData"], dict)
        # Keys presence check between response and get data
        get_keys = get_json["extractedData"].keys()
        assert set(keys).issubset(set(get_keys)), "Persisted extractedData keys mismatch"

    finally:
        # Cleanup: Delete the prescription created during the test
        if prescription_id:
            del_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
            session.delete(del_url, timeout=TIMEOUT)

test_process_prescription_with_ai_returns_extracted_data()