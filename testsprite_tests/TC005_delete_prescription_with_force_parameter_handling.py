import requests
import io

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_delete_prescription_with_force_parameter_handling():
    # Step 1: Upload a prescription file to create a new prescription for testing
    files = [
        ('files', ('test_prescription.png', io.BytesIO(b"fake image data"), 'image/png'))
    ]
    created_prescription_id = None

    try:
        upload_resp = requests.post(
            f"{BASE_URL}/api/prescriptions/upload",
            files=files,
            timeout=TIMEOUT
        )
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        upload_json = upload_resp.json()
        assert "prescriptions" in upload_json and len(upload_json["prescriptions"]) > 0

        created_prescription = upload_json["prescriptions"][0]
        created_prescription_id = created_prescription.get("id")
        assert created_prescription_id, "Uploaded prescription has no id"
        assert "createdAt" in created_prescription, "createdAt field missing in uploaded prescription"

        # Step 2: Try to delete non-existent prescription (expected 404)
        fake_id = "nonexistent-id-123456"
        resp_404 = requests.delete(f"{BASE_URL}/api/prescriptions/{fake_id}", timeout=TIMEOUT)
        assert resp_404.status_code == 404, "Expected 404 for non-existent prescription id"

        # Step 3: Simulate a completed prescription by processing it
        process_body = {
            "selectedModels": ["OpenAI GPT-4V"],
            "customPrompts": {}
        }
        process_resp = requests.post(
            f"{BASE_URL}/api/prescriptions/{created_prescription_id}/process",
            json=process_body,
            timeout=TIMEOUT
        )
        assert process_resp.status_code == 200, f"Processing prescription failed: {process_resp.text}"

        # Step 4: Attempt to delete prescription WITHOUT force param (expect 400)
        resp_400 = requests.delete(f"{BASE_URL}/api/prescriptions/{created_prescription_id}", timeout=TIMEOUT)
        assert resp_400.status_code == 400, "Expected 400 when deleting completed prescription without force"

        # Step 5: Delete prescription WITH force=true query parameter (expect 200)
        resp_200 = requests.delete(
            f"{BASE_URL}/api/prescriptions/{created_prescription_id}?force=true",
            timeout=TIMEOUT
        )
        assert resp_200.status_code == 200, "Expected 200 when deleting with force parameter"

        # Confirm deletion by trying to GET the deleted prescription (expect 404)
        get_resp = requests.get(f"{BASE_URL}/api/prescriptions/{created_prescription_id}", timeout=TIMEOUT)
        assert get_resp.status_code == 404, "Deleted prescription should not be found"

    finally:
        # Cleanup: Attempt to delete the prescription in case it wasn't deleted
        if created_prescription_id:
            # Delete with force parameter to ensure removal
            try:
                requests.delete(
                    f"{BASE_URL}/api/prescriptions/{created_prescription_id}?force=true",
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_delete_prescription_with_force_parameter_handling()
