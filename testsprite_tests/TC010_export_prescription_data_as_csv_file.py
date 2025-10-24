import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_export_prescription_data_as_csv():
    headers = {}
    prescription_ids = []

    # Step 1: Upload prescription image to create a prescription resource for export testing
    # Using a sample image file content for upload; replace 'sample_prescription.jpg' with valid path if needed
    files = [
        ('files', (
            'sample_prescription.jpg',
            b'\xFF\xD8\xFF\xE0' + b'\x00' * 1000,  # Minimal JPEG header with padding bytes
            'image/jpeg'
        ))
    ]

    try:
        upload_resp = requests.post(f"{BASE_URL}/api/prescriptions/upload", files=files, timeout=TIMEOUT)
        assert upload_resp.status_code == 200, f"Upload failed with status {upload_resp.status_code}"
        upload_json = upload_resp.json()
        assert "prescriptionIds" in upload_json, "Response missing 'prescriptionIds'"
        prescription_ids = upload_json["prescriptionIds"]
        assert isinstance(prescription_ids, list) and len(prescription_ids) > 0, "No prescription IDs returned"

        # Wait for processing to complete by polling prescription status until completed or timeout
        max_wait = 60
        interval = 5
        completed = False
        for _ in range(max_wait // interval):
            all_completed = True
            for pid in prescription_ids:
                resp = requests.get(f"{BASE_URL}/api/prescriptions/{pid}", timeout=TIMEOUT)
                if resp.status_code != 200:
                    all_completed = False
                    break
                dat = resp.json()
                status = dat.get("processingStatus")
                if status != "completed":
                    all_completed = False
                    break
            if all_completed:
                completed = True
                break
            time.sleep(interval)

        assert completed, "Prescription processing did not complete in time"

        # Step 2: Test export CSV with single prescriptionId query parameter
        query_params_single = {"prescriptionId": prescription_ids[0]}
        export_single_resp = requests.get(f"{BASE_URL}/api/export/csv", params=query_params_single, timeout=TIMEOUT)
        assert export_single_resp.status_code == 200, f"Export single CSV failed with status {export_single_resp.status_code}"
        content_type_single = export_single_resp.headers.get("Content-Type", "")
        assert "text/csv" in content_type_single.lower(), f"Content-Type is not CSV but {content_type_single}"
        csv_content_single = export_single_resp.text
        assert csv_content_single.strip() != "", "CSV content for single prescription is empty"
        # Basic CSV format check: presence of newline and commas
        assert "," in csv_content_single, "CSV content does not contain commas"
        assert "\n" in csv_content_single, "CSV content does not contain newlines"

        # Step 3: Test export CSV with multiple prescriptionIds (comma-separated)
        pres_ids_str = ",".join(prescription_ids)
        query_params_multi = {"prescriptionIds": pres_ids_str}
        export_multi_resp = requests.get(f"{BASE_URL}/api/export/csv", params=query_params_multi, timeout=TIMEOUT)
        assert export_multi_resp.status_code == 200, f"Export multi CSV failed with status {export_multi_resp.status_code}"
        content_type_multi = export_multi_resp.headers.get("Content-Type", "")
        assert "text/csv" in content_type_multi.lower(), f"Content-Type is not CSV but {content_type_multi}"
        csv_content_multi = export_multi_resp.text
        assert csv_content_multi.strip() != "", "CSV content for multiple prescriptions is empty"
        # Check more than one line since multiple prescriptions
        lines = csv_content_multi.strip().splitlines()
        assert len(lines) > 1, "CSV content for multiple prescriptions should have multiple lines"
        assert "," in csv_content_multi, "CSV content does not contain commas"

        # Step 4: Test export CSV with no query params to export all (should succeed but content depends)
        export_all_resp = requests.get(f"{BASE_URL}/api/export/csv", timeout=TIMEOUT)
        assert export_all_resp.status_code == 200, f"Export all CSV failed with status {export_all_resp.status_code}"
        content_type_all = export_all_resp.headers.get("Content-Type", "")
        assert "text/csv" in content_type_all.lower(), f"Content-Type is not CSV but {content_type_all}"
        csv_content_all = export_all_resp.text
        assert csv_content_all.strip() != "", "CSV content for all prescriptions is empty"
        assert "," in csv_content_all, "CSV content does not contain commas"
        assert "\n" in csv_content_all, "CSV content does not contain newlines"

    finally:
        # Cleanup: delete the created prescriptions
        for pid in prescription_ids:
            try:
                del_resp = requests.delete(f"{BASE_URL}/api/prescriptions/{pid}", timeout=TIMEOUT)
                # Accept 200 or 204 as success for deletion
                assert del_resp.status_code in (200, 204), f"Failed to delete prescription {pid}, status {del_resp.status_code}"
            except Exception:
                pass

test_export_prescription_data_as_csv()
