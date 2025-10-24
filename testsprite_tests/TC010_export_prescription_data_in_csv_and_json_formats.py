import requests
import io
import csv
import json

BASE_URL = "http://localhost:5000"
TIMEOUT = 30


def test_export_prescription_data_csv_json():
    # Helper function to upload a test prescription file
    def upload_prescription_file():
        upload_url = f"{BASE_URL}/api/prescriptions/upload"
        # Create a dummy file in memory with minimal content (simulate prescription image)
        file_content = b"dummy image content"
        # Correctly pass multiple files: list of tuples with key 'files'
        files = [("files", ("test_prescription.png", io.BytesIO(file_content), "image/png"))]
        resp = requests.post(upload_url, files=files, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        assert "prescriptions" in data and isinstance(data["prescriptions"], list)
        assert len(data["prescriptions"]) >= 1
        return data["prescriptions"][0]["id"]

    # Helper function to delete a prescription by id
    def delete_prescription(prescription_id: str):
        delete_url = f"{BASE_URL}/api/prescriptions/{prescription_id}"
        resp = requests.delete(delete_url, timeout=TIMEOUT)
        # Accept 200 or 404 if already deleted to ensure cleanup
        assert resp.status_code in (200, 404)

    prescription_id = None

    try:
        # Step 1: Upload a prescription to obtain a valid prescription ID
        prescription_id = upload_prescription_file()

        # Step 2: Test export single prescription as CSV
        csv_url = f"{BASE_URL}/api/export/csv"
        params_single = {"prescriptionId": prescription_id}
        resp_csv_single = requests.get(csv_url, params=params_single, timeout=TIMEOUT)
        assert resp_csv_single.status_code == 200
        content_type_csv = resp_csv_single.headers.get("Content-Type", "")
        assert "text/csv" in content_type_csv.lower() or "application/csv" in content_type_csv.lower()
        # Validate CSV content is not empty and contains createdAt field in one of the rows/headers
        csv_text = resp_csv_single.text
        assert csv_text.strip() != ""
        csv_reader = csv.reader(csv_text.splitlines())
        rows = list(csv_reader)
        assert len(rows) > 0
        header = rows[0]
        # Normalize header to lower case for checking createdAt (assuming possible case variation)
        header_lower = [h.lower() for h in header]
        assert any(h == "createdat" or h == "created_at" for h in header_lower)

        # Step 3: Test export multiple prescriptions as CSV
        # Upload a second prescription to test multiple export
        prescription_id_2 = upload_prescription_file()
        try:
            params_multiple = {"prescriptionIds": f"{prescription_id},{prescription_id_2}"}
            resp_csv_multiple = requests.get(csv_url, params=params_multiple, timeout=TIMEOUT)
            assert resp_csv_multiple.status_code == 200
            content_type_csv_multi = resp_csv_multiple.headers.get("Content-Type", "")
            assert "text/csv" in content_type_csv_multi.lower() or "application/csv" in content_type_csv_multi.lower()
            csv_text_multi = resp_csv_multiple.text
            assert csv_text_multi.strip() != ""
            csv_reader_multi = csv.reader(csv_text_multi.splitlines())
            rows_multi = list(csv_reader_multi)
            assert len(rows_multi) > 0
            header_multi = rows_multi[0]
            header_lower_multi = [h.lower() for h in header_multi]
            assert any(h == "createdat" or h == "created_at" for h in header_lower_multi)
        finally:
            delete_prescription(prescription_id_2)

        # Step 4: Test export single prescription as JSON
        json_url = f"{BASE_URL}/api/export/json"
        resp_json_single = requests.get(json_url, params=params_single, timeout=TIMEOUT)
        assert resp_json_single.status_code == 200
        content_type_json = resp_json_single.headers.get("Content-Type", "")
        assert "application/json" in content_type_json.lower()
        json_data = resp_json_single.json()
        assert "prescriptions" in json_data and isinstance(json_data["prescriptions"], list)
        assert len(json_data["prescriptions"]) > 0
        # Check presence of createdAt in at least one prescription object
        createdAt_present = any(any(k.lower() == "createdat" for k in pres.keys()) for pres in json_data["prescriptions"])
        assert createdAt_present
        # Also check extractionResults and exportedAt fields exist
        assert "extractionResults" in json_data and isinstance(json_data["extractionResults"], list)
        assert "exportedAt" in json_data and isinstance(json_data["exportedAt"], str)

        # Step 5: Test export multiple prescriptions as JSON
        resp_json_multiple = requests.get(json_url, params=params_multiple, timeout=TIMEOUT)
        assert resp_json_multiple.status_code == 200
        content_type_json_multi = resp_json_multiple.headers.get("Content-Type", "")
        assert "application/json" in content_type_json_multi.lower()
        json_data_multi = resp_json_multiple.json()
        assert "prescriptions" in json_data_multi and isinstance(json_data_multi["prescriptions"], list)
        assert len(json_data_multi["prescriptions"]) > 0
        createdAt_multi = any(any(k.lower() == "createdat" for k in pres.keys()) for pres in json_data_multi["prescriptions"])
        assert createdAt_multi
        assert "extractionResults" in json_data_multi and isinstance(json_data_multi["extractionResults"], list)
        assert "exportedAt" in json_data_multi and isinstance(json_data_multi["exportedAt"], str)

    finally:
        if prescription_id:
            delete_prescription(prescription_id)


test_export_prescription_data_csv_json()