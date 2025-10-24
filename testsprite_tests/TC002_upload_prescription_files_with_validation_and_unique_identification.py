import requests
import io

BASE_URL = "http://localhost:5000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/prescriptions/upload"
DELETE_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/prescriptions/{{}}"
TIMEOUT = 30

# Prepare sample prescription images in memory (simulate files)
def create_sample_image_file(filename: str, content=b"fake-image-content", content_type="image/jpeg"):
    return (filename, io.BytesIO(content), content_type)

def test_upload_prescription_files_with_validation_and_unique_identification():
    # Prepare multiple files with allowed image types
    files = [
        create_sample_image_file("prescription1.jpg"),
        create_sample_image_file("prescription2.png", content_type="image/png"),
    ]

    multipart_files = [("files", file_tuple) for file_tuple in files]

    uploaded_prescriptions = []

    try:
        response = requests.post(
            UPLOAD_ENDPOINT,
            files=multipart_files,
            timeout=TIMEOUT,
        )
        # Validate response status code
        assert response.status_code == 200, f"Expected status 200, got {response.status_code} - {response.text}"
        resp_json = response.json()
        # Validate presence of success message and prescriptions array
        assert "message" in resp_json, "No success message in response"
        assert isinstance(resp_json.get("prescriptions"), list), "Prescriptions list missing or not a list"
        assert len(resp_json["prescriptions"]) == len(files), "Uploaded prescriptions count mismatch with files sent"
        uploaded_prescriptions = resp_json["prescriptions"]
        for p in uploaded_prescriptions:
            # Each prescription item validations
            assert "id" in p and isinstance(p["id"], str) and p["id"], "Missing or invalid id"
            assert "fileName" in p and isinstance(p["fileName"], str) and p["fileName"], "Missing or invalid fileName"
            assert "fileSize" in p and p["fileSize"], "Missing fileSize"
            assert "createdAt" in p and p["createdAt"], "Missing createdAt field"
            # Basic check to prevent server 500 due to validation problems
            # Ensure no 500 happened internally by absence of error keys
            assert "processingStatus" in p, "Missing processingStatus"

    finally:
        # Cleanup: delete uploaded prescriptions if created
        for pres in uploaded_prescriptions:
            pid = pres.get("id")
            if pid:
                try:
                    del_resp = requests.delete(
                        DELETE_ENDPOINT_TEMPLATE.format(pid), timeout=TIMEOUT
                    )
                    assert del_resp.status_code == 200 or del_resp.status_code == 404, \
                        f"Unexpected delete status {del_resp.status_code} for prescription ID {pid}"
                except Exception:
                    pass

test_upload_prescription_files_with_validation_and_unique_identification()
