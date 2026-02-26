# ScriptSensei API Usage Guide

This guide describes how to interact with the ScriptSensei API from external applications.

## Authentication

All API requests must include the `X-API-Key` header with a valid API key.

```http
X-API-Key: YOUR_EXTERNAL_API_KEY
```

### Where to set the key?

Since you are not using Replit, there are two primary ways to set this variable:

#### A. Using `.env` file (Recommended)
1. Create a file named `.env` in the root directory (based on `deployment.env.example`).
2. Add the following line:
   ```bash
   EXTERNAL_API_KEY=your_very_secret_key
   ```
3. Restart your server.

#### B. Using PM2 (If you use `ecosystem.config.js`)
If you are running the app with PM2, you can also add it to the `env_production` section:
```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 5000,
  EXTERNAL_API_KEY: 'your_very_secret_key'
}
```

---

## Usage Examples

### JavaScript (fetch)
```javascript
const uploadPrescription = async (file) => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch('http://your-app-url/api/prescriptions/upload', {
    method: 'POST',
    headers: {
      'X-API-Key': 'your_secret_key'
    },
    body: formData
  });

  return await response.json();
};
```

### Python (requests)
```python
import requests

url = "http://your-app-url/api/prescriptions/upload"
headers = {"X-API-Key": "your_secret_key"}
files = {"files": open("prescription.jpg", "rb")}

response = requests.post(url, headers=headers, files=files)
print(response.json())
```

## Endpoints

```

### 1.5 Seamless: Upload & Process (Single Request)
Upload an image and get extraction results immediately in a single response. **Recommended for most external integrations.**

**URL**: `POST /api/prescriptions/upload-and-process`
**Content-Type**: `multipart/form-data`

**Body**:
- `files`: The image file (JPEG/PNG).

**Response**:
```json
{
  "id": "uuid",
  "status": "completed",
  "fileName": "prescription.jpg",
  "extractedData": { 
     "patient": { "name": "...", "age": "..." },
     "medications": [ ... ]
  },
  "modelResults": [ ... ]
}
```

### 2. Manual Process (Two-Step Alternative)
If you prefer to upload first and process later:
Analyze a prescription using specific AI models.

**URL**: `POST /api/prescriptions/:id/process`
**Content-Type**: `application/json`

**Body**:
```json
{
  "selectedModels": ["openai", "claude", "gemini"],
  "customPrompts": {
    "patientName": "Extract the patient's full name clearly."
  }
}
```

### 3. Get Extraction Results
Retrieve the extracted data and status of a prescription.

**URL**: `GET /api/prescriptions/:id`

**Response**:
```json
{
  "prescription": {
    "id": "uuid",
    "processingStatus": "completed",
    "extractedData": { ... }
  },
  "extractionResults": [ ... ]
}
```

### 4. Export Data
Export prescriptions in CSV or JSON format.

**URL**: `GET /api/export/csv` or `GET /api/export/json`

---

```bash
curl -X POST http://your-app-url/api/prescriptions/upload-and-process \
  -H "X-API-Key: your_key_here" \
  -F "file=@my_prescription.jpg"
```
