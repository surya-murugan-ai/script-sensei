import requests
import io

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_process_existing_prescription_without_file_upload():
    # Helper to upload a prescription file
    def upload_prescription_file():
        upload_url = f"{BASE_URL}/api/prescriptions/upload"
        files = [
            ('files', ('test_prescription.png', io.BytesIO(b'test image content'), 'image/png'))
        ]
        response = requests.post(upload_url, files=files, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        assert "prescriptions" in data and isinstance(data["prescriptions"], list)
        assert len(data["prescriptions"]) > 0
        prescription = data["prescriptions"][0]
        assert "id" in prescription
        assert "createdAt" in prescription
        return prescription["id"]

    # Helper to delete a prescription by id
    def delete_prescription(prescription_id):
        del_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
        try:
            response = requests.delete(del_url, timeout=TIMEOUT)
            # It is okay if deletion returns 404 because it might already be deleted.
            if response.status_code not in [200, 404]:
                response.raise_for_status()
        except requests.RequestException:
            pass

    # Upload a prescription to get a valid id with image data
    prescription_id = None
    try:
        prescription_id = upload_prescription_file()

        # 1. Test successful processing (200)
        process_url = f"{BASE_URL}/api/prescriptions/{prescription_id}/process-existing"
        resp = requests.post(process_url, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 on successful processing, got {resp.status_code}"

        # 2. Test 400 if no image data available
        get_all_url = f"{BASE_URL}/api/prescriptions"
        get_resp = requests.get(get_all_url, timeout=TIMEOUT)
        get_resp.raise_for_status()
        prescriptions = get_resp.json()
        no_image_data_id = None
        for p in prescriptions:
            if not p.get("imageData"):
                no_image_data_id = p.get("id")
                break

        if no_image_data_id:
            resp_400 = requests.post(f"{BASE_URL}/api/prescriptions/{no_image_data_id}/process-existing", timeout=TIMEOUT)
            assert resp_400.status_code == 400, f"Expected 400 if no image data, got {resp_400.status_code}"

        # 3. Test 404 if prescription not found
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp_404 = requests.post(f"{BASE_URL}/api/prescriptions/{fake_id}/process-existing", timeout=TIMEOUT)
        assert resp_404.status_code == 404, f"Expected 404 for non-existent prescription, got {resp_404.status_code}"

    finally:
        if prescription_id:
            # Clean up created prescription
            delete_prescription(prescription_id)

test_process_existing_prescription_without_file_upload()
