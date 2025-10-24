import requests
import io
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS_JSON = {"Content-Type": "application/json"}

def test_process_prescription_with_selected_ai_models_and_custom_prompts():
    # Step 1: Upload a prescription file to create a prescription resource for testing
    files = [
        ("files", (
            "test_prescription.jpg",
            io.BytesIO(b"\xff\xd8\xff\xe0" + b"0" * 1024),  # minimal JPEG header + padding bytes
            "image/jpeg",
        ))
    ]
    upload_resp = requests.post(f"{BASE_URL}/api/prescriptions/upload", files=files, timeout=TIMEOUT)
    assert upload_resp.status_code == 200, "Uploading prescription file failed"
    upload_data = upload_resp.json()
    assert "prescriptions" in upload_data and len(upload_data["prescriptions"]) > 0, "No prescriptions returned after upload"
    prescription = upload_data["prescriptions"][0]
    prescription_id = prescription.get("id")
    assert prescription_id, "Uploaded prescription has no id"

    # Verify createdAt field presence in uploaded prescription
    assert "createdAt" in prescription, "createdAt field missing in uploaded prescription"

    try:
        # Step 2: Test processing with valid payload - selectedModels and customPrompts
        process_payload = {
            "selectedModels": ["OpenAI GPT-4V", "Anthropic Claude", "Google Gemini"],
            "customPrompts": {
                "OpenAI GPT-4V": "Extract patient name and medication details",
                "Anthropic Claude": "Focus on dosage information",
                "Google Gemini": "Analyze investigations and doctor notes"
            }
        }
        process_resp = requests.post(
            f"{BASE_URL}/api/prescriptions/{prescription_id}/process",
            json=process_payload,
            headers=HEADERS_JSON,
            timeout=TIMEOUT
        )
        assert process_resp.status_code == 200, "Processing prescription failed with valid data"

        # Step 3: Test processing with non-existent prescription ID
        fake_id = "nonexistent-prescription-id-12345"
        fake_payload = {
            "selectedModels": ["OpenAI GPT-4V"],
            "customPrompts": {"OpenAI GPT-4V": "Extract all details"}
        }
        fake_resp = requests.post(
            f"{BASE_URL}/api/prescriptions/{fake_id}/process",
            json=fake_payload,
            headers=HEADERS_JSON,
            timeout=TIMEOUT
        )
        assert fake_resp.status_code == 404, f"Expected 404 for non-existent prescription, got {fake_resp.status_code}"

    finally:
        # Cleanup: Delete the created prescription
        del_resp = requests.delete(f"{BASE_URL}/api/prescriptions/{prescription_id}", timeout=TIMEOUT)
        # Could be 200 if deleted or 404 if already gone
        assert del_resp.status_code in (200, 404), f"Failed to delete prescription {prescription_id} after test"


test_process_prescription_with_selected_ai_models_and_custom_prompts()
