import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_delete_prescription_supports_force_delete_option():
    # Step 1: Upload a prescription image to create a prescription resource to delete
    upload_url = f"{BASE_URL}/api/prescriptions/upload"
    # Using a small dummy image file from binary data for upload
    dummy_image_content = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02"
        b"\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = [("files", ("test.png", dummy_image_content, "image/png"))]
    try:
        upload_resp = requests.post(upload_url, files=files, timeout=TIMEOUT)
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        upload_data = upload_resp.json()
        assert "prescriptionIds" in upload_data and len(upload_data["prescriptionIds"]) > 0
        prescription_id = upload_data["prescriptionIds"][0]

        delete_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"

        # Step 2: Verify the prescription exists before deletion (optional sanity check)
        get_resp = requests.get(delete_url, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Prescription not found before deletion: {get_resp.text}"

        # Step 3: Delete the prescription without force parameter
        del_resp = requests.delete(delete_url, timeout=TIMEOUT)
        assert del_resp.status_code == 200, f"Deletion without force failed: {del_resp.text}"

        # Step 4: After deletion, verify the prescription is not retrievable (expect 404 or similar)
        get_after_del_resp = requests.get(delete_url, timeout=TIMEOUT)
        assert get_after_del_resp.status_code in (404, 410), "Prescription still accessible after deletion"

        # Step 5: Re-upload the prescription to test force delete
        reupload_resp = requests.post(upload_url, files=files, timeout=TIMEOUT)
        assert reupload_resp.status_code == 200, f"Re-upload failed: {reupload_resp.text}"
        reupload_data = reupload_resp.json()
        prescription_id_force = reupload_data["prescriptionIds"][0]

        # Step 6: Delete with force=true query parameter
        force_delete_url = f"{BASE_URL}/api/prescriptions/{prescription_id_force}?force=true"
        force_del_resp = requests.delete(force_delete_url, timeout=TIMEOUT)
        assert force_del_resp.status_code == 200, f"Force deletion failed: {force_del_resp.text}"

        # Step 7: Verify prescription is deleted after force delete
        get_after_force_del_resp = requests.get(f"{BASE_URL}/api/prescriptions/{prescription_id_force}", timeout=TIMEOUT)
        assert get_after_force_del_resp.status_code in (404, 410), "Prescription still accessible after force deletion"

    finally:
        # Cleanup attempts just in case the prescription still exists
        # Non-forced delete
        try:
            requests.delete(f"{BASE_URL}/api/prescriptions/{prescription_id}", timeout=TIMEOUT)
        except:
            pass
        try:
            requests.delete(f"{BASE_URL}/api/prescriptions/{prescription_id_force}", timeout=TIMEOUT)
        except:
            pass

test_delete_prescription_supports_force_delete_option()
