
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** ScriptSensei
- **Date:** 2025-10-24
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** health check endpoint returns application status uptime
- **Test Code:** [TC001_health_check_endpoint_returns_application_status_uptime.py](./TC001_health_check_endpoint_returns_application_status_uptime.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/0df655bd-63a1-45d3-86bd-7881446c70c6
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** upload prescription files with validation and unique identification
- **Test Code:** [TC002_upload_prescription_files_with_validation_and_unique_identification.py](./TC002_upload_prescription_files_with_validation_and_unique_identification.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 62, in <module>
  File "<string>", line 31, in test_upload_prescription_files_with_validation_and_unique_identification
AssertionError: Expected status 200, got 400 - {"error":"No files could be processed"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/4dce72e0-8a10-4558-adb7-11d049c848ed
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** retrieve all prescriptions with correct data structure
- **Test Code:** [TC003_retrieve_all_prescriptions_with_correct_data_structure.py](./TC003_retrieve_all_prescriptions_with_correct_data_structure.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/5f652667-8525-4d7e-9d4e-9ca7741c791c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** retrieve prescription by id with extraction results
- **Test Code:** [TC004_retrieve_prescription_by_id_with_extraction_results.py](./TC004_retrieve_prescription_by_id_with_extraction_results.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 98, in <module>
  File "<string>", line 26, in test_retrieve_prescription_by_id_with_extraction_results
AssertionError: Upload failed with status 500 and text {"message":"Unexpected field"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/d44b538d-77ee-42f6-b73b-88c41e4c16db
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** delete prescription with force parameter handling
- **Test Code:** [TC005_delete_prescription_with_force_parameter_handling.py](./TC005_delete_prescription_with_force_parameter_handling.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 73, in <module>
  File "<string>", line 20, in test_delete_prescription_with_force_parameter_handling
AssertionError: Upload failed: {"error":"No files could be processed"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/f9a19047-41b2-4bb9-a8bf-119226411031
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** process prescription with selected ai models and custom prompts
- **Test Code:** [TC006_process_prescription_with_selected_ai_models_and_custom_prompts.py](./TC006_process_prescription_with_selected_ai_models_and_custom_prompts.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 68, in <module>
  File "<string>", line 19, in test_process_prescription_with_selected_ai_models_and_custom_prompts
AssertionError: Uploading prescription file failed

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/f4b001d2-f35e-48a6-8c51-30ae2eb43f64
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** process existing prescription without file upload
- **Test Code:** [TC007_process_existing_prescription_without_file_upload.py](./TC007_process_existing_prescription_without_file_upload.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 70, in <module>
  File "<string>", line 38, in test_process_existing_prescription_without_file_upload
  File "<string>", line 15, in upload_prescription_file
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 400 Client Error: Bad Request for url: http://localhost:5000/api/prescriptions/upload

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/9a60bc1c-60a1-496a-80e3-75922e1a51df
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** get all extraction results with correct schema
- **Test Code:** [TC008_get_all_extraction_results_with_correct_schema.py](./TC008_get_all_extraction_results_with_correct_schema.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/440d4415-7cdf-4255-a7de-330695db6f77
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** manage extraction configurations crud operations
- **Test Code:** [TC009_manage_extraction_configurations_crud_operations.py](./TC009_manage_extraction_configurations_crud_operations.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/e0e9f3b7-227e-4729-958f-6b72e7ce48aa
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** export prescription data in csv and json formats
- **Test Code:** [TC010_export_prescription_data_in_csv_and_json_formats.py](./TC010_export_prescription_data_in_csv_and_json_formats.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 110, in <module>
  File "<string>", line 36, in test_export_prescription_data_csv_json
  File "<string>", line 19, in upload_prescription_file
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 400 Client Error: Bad Request for url: http://localhost:5000/api/prescriptions/upload

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1410c8a3-78ca-4402-b7a2-8a693caa587a/9899918b-d9ca-42ec-a629-7d74dc6a180b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **40.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---