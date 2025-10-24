import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_prescription_by_id_returns_prescription_details():
    # Prepare: Upload a sample prescription image to create a prescription record
    upload_url = f"{BASE_URL}/api/prescriptions/upload"
    files = {
        "files": ("test_prescription.jpg", b"fake_image_data_for_test_purpose", "image/jpeg")
    }
    prescription_id = None
    try:
        # Upload prescription image
        upload_response = requests.post(upload_url, files=files, timeout=TIMEOUT)
        assert upload_response.status_code == 200, f"Upload failed with status {upload_response.status_code}"
        upload_json = upload_response.json()
        assert "prescriptionIds" in upload_json, "No prescriptionIds in upload response"
        prescription_ids = upload_json["prescriptionIds"]
        assert isinstance(prescription_ids, list) and len(prescription_ids) > 0, "Uploaded prescriptionIds list is empty"
        prescription_id = prescription_ids[0]

        # Since the system processes AI extraction in background, wait and poll for processing completion and data presence
        get_prescription_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
        max_retries = 10
        retry_delay = 3  # seconds
        prescription_data = None
        for _ in range(max_retries):
            get_response = requests.get(get_prescription_url, timeout=TIMEOUT)
            if get_response.status_code == 200:
                data = get_response.json()
                # Validate presence of required fields
                if data.get("processingStatus") in ("completed", "failed") and "extractedData" in data:
                    prescription_data = data
                    break
            time.sleep(retry_delay)
        assert prescription_data is not None, "Prescription data with processingStatus and extractedData not available after retries"

        # Assertions on the prescription data
        assert prescription_data["id"] == prescription_id, "Prescription ID mismatch"
        assert isinstance(prescription_data["processingStatus"], str), "processingStatus is not a string"
        assert isinstance(prescription_data["extractedData"], dict), "extractedData is not an object"

    finally:
        # Cleanup: Delete the created prescription to avoid pollution
        if prescription_id:
            delete_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
            try:
                requests.delete(delete_url, timeout=TIMEOUT)
            except Exception:
                pass

test_get_prescription_by_id_returns_prescription_details()