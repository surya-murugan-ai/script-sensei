import requests
import io

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_retrieve_prescription_by_id_with_extraction_results():
    # Step 1: Upload a prescription file to create resource for testing
    upload_url = f"{BASE_URL}/api/prescriptions/upload"
    # Prepare a small dummy image byte content for upload
    dummy_image_content = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
        b"\x00\x00\nIDATx\xdacd\xf8\x0f\x00\x01\x01\x01\x00"
        b"\x18\xdd\x03\xc6\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = [
        ('files[]', ('test_prescription.png', io.BytesIO(dummy_image_content), 'image/png'))
    ]

    prescription_id = None
    config_id = None
    try:
        # Upload prescription file
        response = requests.post(upload_url, files=files, timeout=TIMEOUT)
        assert response.status_code == 200, f"Upload failed with status {response.status_code} and text {response.text}"
        json_resp = response.json()
        assert "prescriptions" in json_resp and len(json_resp["prescriptions"]) > 0, "No prescriptions returned on upload success"
        prescription = json_resp["prescriptions"][0]
        assert "id" in prescription, "Uploaded prescription missing id"
        prescription_id = prescription["id"]
        assert "createdAt" not in prescription or isinstance(prescription.get("createdAt", None), (str, type(None))), "createdAt field type invalid on upload response"

        # Step 2: Create an AI extraction configuration to validate AI config creation
        config_url = f"{BASE_URL}/api/configs"
        config_payload = {
            "name": "Test Configuration",
            "selectedModels": ["OpenAI GPT-4V", "Anthropic Claude", "Google Gemini"],
            "selectedFields": ["patientName", "medication", "doctorName"],
            "customPrompts": {"patientName": "Detect patient's full name"},
            "isDefault": False
        }
        config_resp = requests.post(config_url, json=config_payload, timeout=TIMEOUT)
        assert config_resp.status_code == 201, f"Config creation failed with status {config_resp.status_code} and text {config_resp.text}"
        created_config = config_resp.json()
        assert "id" in created_config, "Configuration creation response missing id"

        # If returned config has id, store it for cleanup
        if "id" in created_config:
            config_id = created_config["id"]

        # Step 3: Process the uploaded prescription using the AI models with the created config
        process_url = f"{BASE_URL}/api/prescriptions/{prescription_id}/process"
        process_payload = {
            "selectedModels": ["OpenAI GPT-4V", "Anthropic Claude", "Google Gemini"],
            "customPrompts": {"patientName": "Detect patient's full name"}
        }
        process_resp = requests.post(process_url, json=process_payload, timeout=TIMEOUT)
        # Processing might be async or synchronous; assume synchronous success
        assert process_resp.status_code == 200, f"Processing failed with status {process_resp.status_code} and text {process_resp.text}"

        # Step 4: Retrieve prescription by id, expecting extraction results and createdAt field
        get_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
        get_resp = requests.get(get_url, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get prescription by id failed with status {get_resp.status_code} and text {get_resp.text}"
        prescription_data = get_resp.json()
        # Check for the createdAt field existence and validity
        assert "createdAt" in prescription_data, "createdAt field missing in retrieved prescription"
        assert isinstance(prescription_data["createdAt"], str) and len(prescription_data["createdAt"]) > 0, "createdAt field invalid or empty"
        # Check extraction results presence and structure
        assert "extractedData" in prescription_data, "extractedData missing in prescription response"
        extracted_data = prescription_data["extractedData"]
        assert isinstance(extracted_data, dict), f"extractedData is not a dict: {extracted_data}"
        # It's acceptable if extractedData is empty dict if AI extraction is still being processed,
        # but we at least check the field exists.

        # Step 5: Retrieve prescription by invalid/non-existent id to confirm 404
        invalid_id = "invalid-id-1234abcd"
        invalid_resp = requests.get(f"{BASE_URL}/api/prescriptions/{invalid_id}", timeout=TIMEOUT)
        assert invalid_resp.status_code == 404, f"Expected 404 for invalid id, got {invalid_resp.status_code}"

    finally:
        # Cleanup: Delete the uploaded prescription
        if prescription_id:
            del_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
            try:
                requests.delete(del_url, timeout=TIMEOUT)
            except Exception:
                pass
        # Cleanup: Delete configuration if created and id is known
        if config_id:
            try:
                del_config_url = f"{BASE_URL}/api/configs/{config_id}"
                requests.delete(del_config_url, timeout=TIMEOUT)
            except Exception:
                pass

test_retrieve_prescription_by_id_with_extraction_results()
