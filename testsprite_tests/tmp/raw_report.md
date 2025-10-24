
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** ScriptSensei
- **Date:** 2025-10-24
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** health check api returns application status
- **Test Code:** [TC001_health_check_api_returns_application_status.py](./TC001_health_check_api_returns_application_status.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/518535d0-daf0-4cf3-a843-d6bb949a1025
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** get all prescriptions returns prescription list
- **Test Code:** [TC002_get_all_prescriptions_returns_prescription_list.py](./TC002_get_all_prescriptions_returns_prescription_list.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 35, in <module>
  File "<string>", line 32, in test_get_all_prescriptions_returns_prescription_list
AssertionError: Prescription missing 'createdAt' field

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/6c4468a3-c184-484f-8285-cd6cc7313aeb
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** upload prescription images accepts multiple files
- **Test Code:** [TC003_upload_prescription_images_accepts_multiple_files.py](./TC003_upload_prescription_images_accepts_multiple_files.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 74, in <module>
  File "<string>", line 53, in test_tc003_upload_prescription_images_accepts_multiple_files
AssertionError: Expected status 200, got 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/e00d305e-1a9a-4f74-8185-13f36cc6b63d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** get prescription by id returns prescription details
- **Test Code:** [TC004_get_prescription_by_id_returns_prescription_details.py](./TC004_get_prescription_by_id_returns_prescription_details.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 54, in <module>
  File "<string>", line 17, in test_get_prescription_by_id_returns_prescription_details
AssertionError: Upload failed with status 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/7ac4cb3f-1864-42c1-a833-ae90dc173d3f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** delete prescription supports force delete option
- **Test Code:** [TC005_delete_prescription_supports_force_delete_option.py](./TC005_delete_prescription_supports_force_delete_option.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 64, in <module>
  File "<string>", line 18, in test_delete_prescription_supports_force_delete_option
AssertionError: Upload failed: {"error":"Failed to upload files"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/3b4c3e79-7ee6-46ea-8e4e-9954c1ab9545
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** process prescription with ai returns extracted data
- **Test Code:** [TC006_process_prescription_with_ai_returns_extracted_data.py](./TC006_process_prescription_with_ai_returns_extracted_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 64, in <module>
  File "<string>", line 22, in test_process_prescription_with_ai_returns_extracted_data
AssertionError: Upload failed with status 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/e703b0ea-9382-4a8c-8317-2d1193d77519
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** get all extraction results returns ai extraction data
- **Test Code:** [TC007_get_all_extraction_results_returns_ai_extraction_data.py](./TC007_get_all_extraction_results_returns_ai_extraction_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 80, in <module>
  File "<string>", line 32, in test_get_all_extraction_results_returns_ai_extraction_data
AssertionError: Upload failed: {"error":"Failed to upload files"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/43d8eed2-4e50-48bb-affe-a0f5f687ad10
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** get ai configurations returns configuration list
- **Test Code:** [TC008_get_ai_configurations_returns_configuration_list.py](./TC008_get_ai_configurations_returns_configuration_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/df6aebca-9dc2-4b92-9ee5-8d38a50d93f5
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** create ai configuration stores new configuration
- **Test Code:** [TC009_create_ai_configuration_stores_new_configuration.py](./TC009_create_ai_configuration_stores_new_configuration.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 38, in <module>
  File "<string>", line 19, in test_create_ai_configuration_stores_new_configuration
AssertionError: Expected 201, got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/52ebd90f-f631-44c4-82e3-95e3fd3c98a6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** export prescription data as csv file
- **Test Code:** [TC010_export_prescription_data_as_csv_file.py](./TC010_export_prescription_data_as_csv_file.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 98, in <module>
  File "<string>", line 23, in test_export_prescription_data_as_csv
AssertionError: Upload failed with status 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75b9eca9-d2a5-41f7-a86d-27c238bcb802/151720bc-6648-4455-ad47-93bdeda6162a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **20.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---