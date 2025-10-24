import requests
import uuid

BASE_URL = "http://localhost:5000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30


def test_manage_extraction_configurations_crud_operations():
    # Helper function to create config payload
    def create_config_payload(name_suffix="test"):
        return {
            "name": f"Config {name_suffix} {uuid.uuid4()}",
            "selectedModels": ["OpenAI GPT-4V", "Anthropic Claude"],
            "selectedFields": ["patientName", "medication", "doctorName"],
            "customPrompts": {"patientName": "Extract patient full name."},
            "isDefault": False
        }

    # 1. GET /api/configs - initial fetch all configurations
    resp_get_initial = requests.get(f"{BASE_URL}/api/configs", timeout=TIMEOUT)
    assert resp_get_initial.status_code == 200, f"Expected 200 but got {resp_get_initial.status_code}"
    configs_initial = resp_get_initial.json()
    assert isinstance(configs_initial, list), "GET /api/configs did not return a list"
    # Verify createdAt field presence for each config
    for c in configs_initial:
        assert "createdAt" in c, "Configuration missing 'createdAt' field"

    config_id = None
    try:
        # 2. POST /api/configs - create new configuration with valid payload
        new_config_payload = create_config_payload()
        resp_post = requests.post(
            f"{BASE_URL}/api/configs",
            json=new_config_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp_post.status_code == 201, f"Expected 201 on create but got {resp_post.status_code}"
        created_config = resp_post.json()
        # The API might return the created config or only message - adjust assertion accordingly
        if isinstance(created_config, dict):
            # Should contain at least an id and createdAt in returned data
            assert "id" in created_config or "name" in created_config, "Created config response missing expected keys"
            # If id is available use it for update
            if "id" in created_config:
                config_id = created_config["id"]
            elif "name" in created_config:
                # Try to refetch to get created config id
                # fallback in case API returns created object partially
                fetch_resp = requests.get(f"{BASE_URL}/api/configs", timeout=TIMEOUT)
                configs = fetch_resp.json()
                for conf in configs:
                    if conf.get("name") == new_config_payload["name"]:
                        config_id = conf.get("id")
                        break
            # Check for createdAt presence
            if "createdAt" in created_config:
                assert created_config["createdAt"], "'createdAt' field is empty"
        else:
            # If nothing returned, try to fetch by name if possible
            fetch_resp = requests.get(f"{BASE_URL}/api/configs", timeout=TIMEOUT)
            configs = fetch_resp.json()
            for conf in configs:
                if conf.get("name") == new_config_payload["name"]:
                    config_id = conf.get("id")
                    break
        assert config_id is not None, "Created configuration id could not be determined"

        # 3. POST /api/configs - create new configuration with invalid payload (missing required fields)
        invalid_payload = {
            "selectedModels": ["OpenAI GPT-4V"],
            # missing name and selectedFields
        }
        resp_post_invalid = requests.post(
            f"{BASE_URL}/api/configs",
            json=invalid_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp_post_invalid.status_code == 400, f"Expected 400 on invalid create but got {resp_post_invalid.status_code}"

        # 4. PUT /api/configs/{id} - update existing configuration
        update_payload = {
            "name": f"Updated Config {uuid.uuid4()}",
            "selectedModels": ["Google Gemini"],
            "selectedFields": ["patientName", "investigations"],
            "customPrompts": {"investigations": "Extract medical investigation details."},
            "isDefault": True,
        }
        resp_put = requests.put(
            f"{BASE_URL}/api/configs/{config_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp_put.status_code == 200, f"Expected 200 on update but got {resp_put.status_code}"

        # Verify update by GET /api/configs and finding updated config
        resp_get_after_update = requests.get(f"{BASE_URL}/api/configs", timeout=TIMEOUT)
        assert resp_get_after_update.status_code == 200, "Failed to retrieve configs after update"
        configs_after_update = resp_get_after_update.json()
        updated_config = None
        for c in configs_after_update:
            if c.get("id") == config_id:
                updated_config = c
                break
        assert updated_config is not None, "Updated configuration not found in GET /api/configs"
        assert updated_config.get("name") == update_payload["name"], "Configuration name not updated correctly"
        assert updated_config.get("isDefault") == True, "Configuration isDefault not updated correctly"
        assert "createdAt" in updated_config, "Updated configuration missing 'createdAt' field"

        # 5. PUT /api/configs/{id} - update non-existent configuration, expect 404
        non_existent_id = str(uuid.uuid4())
        resp_put_404 = requests.put(
            f"{BASE_URL}/api/configs/{non_existent_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp_put_404.status_code == 404, f"Expected 404 on update non-existent config but got {resp_put_404.status_code}"

    finally:
        # Cleanup: delete the created config if possible (if API supports delete, else skip)
        if config_id:
            try:
                requests.delete(f"{BASE_URL}/api/configs/{config_id}", timeout=TIMEOUT)
            except Exception:
                pass


test_manage_extraction_configurations_crud_operations()