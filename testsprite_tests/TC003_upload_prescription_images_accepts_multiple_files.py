import requests
import io

BASE_URL = "http://localhost:3000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/prescriptions/upload"
DELETE_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/prescriptions/{{}}"

# Accepted MIME types for prescription images according to typical image upload standards
ACCEPTED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp"
]

# Generate dummy image binary data for test files (minimal valid JPEG header)
DUMMY_JPEG = (
    b"\xFF\xD8\xFF"  # SOI marker
    b"\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xFF\xD9"  # EOI marker
)

DUMMY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f"
    b"\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\xf8\x0f\x00\x01\x01"
    b"\x01\x00\x18\xdd\x18\xb5\x00\x00\x00\x00IEND\xaeB`\x82"
)

def test_tc003_upload_prescription_images_accepts_multiple_files():
    # Prepare multiple files with various accepted types and sizes
    
    files = {
        "files": [
            ("files", ("prescription1.jpg", io.BytesIO(DUMMY_JPEG), "image/jpeg")),
            ("files", ("prescription2.png", io.BytesIO(DUMMY_PNG), "image/png")),
            ("files", ("prescription3.jpg", io.BytesIO(DUMMY_JPEG), "image/jpeg"))
        ]
    }
    
    prescription_ids = []
    try:
        response = requests.post(
            UPLOAD_ENDPOINT,
            files=[
                ("files", ("prescription1.jpg", io.BytesIO(DUMMY_JPEG), "image/jpeg")),
                ("files", ("prescription2.png", io.BytesIO(DUMMY_PNG), "image/png")),
                ("files", ("prescription3.jpg", io.BytesIO(DUMMY_JPEG), "image/jpeg")),
            ],
            timeout=30
        )
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        
        resp_json = response.json()
        assert "message" in resp_json, "Response JSON missing 'message'"
        assert "prescriptionIds" in resp_json, "Response JSON missing 'prescriptionIds'"
        assert isinstance(resp_json["prescriptionIds"], list), "'prescriptionIds' is not a list"
        assert len(resp_json["prescriptionIds"]) == 3, f"Expected 3 prescriptionIds, got {len(resp_json['prescriptionIds'])}"
        prescription_ids = resp_json["prescriptionIds"]
        for pid in prescription_ids:
            assert isinstance(pid, str) and pid.strip() != "", f"Invalid prescription ID returned: {pid}"
    finally:
        # Cleanup: delete uploaded prescriptions to avoid DB pollution
        for pid in prescription_ids:
            try:
                del_resp = requests.delete(DELETE_ENDPOINT_TEMPLATE.format(pid), timeout=30)
                # We consider delete success if status code is 200 or 204 or 404 (already deleted)
                assert del_resp.status_code in [200, 204, 404], f"Failed to delete prescription ID {pid}, status: {del_resp.status_code}"
            except Exception:
                pass


test_tc003_upload_prescription_images_accepts_multiple_files()