# Waqf Qatar Prayer Times - Postman Collection

This directory contains Postman collection and environment files for testing the Waqf Qatar Prayer Times API.

## Files

- `Waqf-Qatar-Prayer-Times.postman_collection.json` - Complete API collection
- `Waqf-Environment.postman_environment.json` - Environment variables

## Import Instructions

1. **Import Collection**:
   - Open Postman
   - Click "Import" button
   - Select `Waqf-Qatar-Prayer-Times.postman_collection.json`

2. **Import Environment**:
   - Click "Import" button
   - Select `Waqf-Environment.postman_environment.json`
   - Select the "Waqf Qatar Environment" from the environment dropdown

3. **Update URLs**:
   - After deployment, update the environment variables:
   - `WAQF_BASE_URL`: Your actual Cloud Function API URL
   - `WAQF_SYNC_URL`: Your actual Cloud Function sync URL

## Collection Structure

### 📁 Waqf API Endpoints
- **Health Check**: Test API status
- **Get Today's Prayer Times**: Current day prayer times
- **Get Prayer Times by Date**: Specific date prayer times
- **Get Monthly Prayer Times**: Full month data
- **Get Next Prayer**: Next upcoming prayer

### 📁 Sync Function
- **Manual Sync Trigger**: Manually trigger data sync

### 📁 External Aladhan API
- **Get Calendar - Current Month**: Fetch current month from Aladhan
- **Get Calendar - Next Month**: Fetch next month from Aladhan
- **Get Single Day Prayer Times**: Single day from Aladhan
- **Get Available Methods**: List all calculation methods

### 📁 Testing & Development
- **Test API Response Time**: Performance testing
- **Validate Prayer Times Format**: Data validation

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WAQF_BASE_URL` | Your deployed API URL | `https://me-central1-project.cloudfunctions.net/waqf-api` |
| `WAQF_SYNC_URL` | Your deployed sync URL | `https://me-central1-project.cloudfunctions.net/waqf-sync` |
| `LOCAL_BASE_URL` | Local development URL | `http://localhost:8080` |
| `ALADHAN_BASE_URL` | Aladhan API base | `http://api.aladhan.com/v1` |
| `QATAR_LAT` | Qatar latitude | `25.2854` |
| `QATAR_LNG` | Qatar longitude | `51.5310` |
| `CALCULATION_METHOD` | ISNA method | `2` |

## Dynamic Variables

The collection automatically sets these variables:
- `current_month`: Current month (1-12)
- `current_year`: Current year
- `next_month`: Next month
- `next_year`: Next year (if December)
- `target_date`: Today's date in DD/MM/YYYY format

## Testing Features

### Automated Tests
- Response time validation (< 2000ms)
- Status code verification (200)
- JSON structure validation
- Prayer times format validation (HH:MM)

### Usage Examples

1. **Test Your Deployed API**:
   ```
   GET {{WAQF_BASE_URL}}/health
   GET {{WAQF_BASE_URL}}/prayer-times
   GET {{WAQF_BASE_URL}}/next
   ```

2. **Test Aladhan API Integration**:
   ```
   GET http://api.aladhan.com/v1/calendar?latitude={{QATAR_LAT}}&longitude={{QATAR_LNG}}&method={{CALCULATION_METHOD}}&month={{current_month}}&year={{current_year}}
   ```

3. **Trigger Manual Sync**:
   ```
   POST {{WAQF_SYNC_URL}}
   ```

## Local Development

For local testing:
1. Set `LOCAL_BASE_URL` as active in environment
2. Run `npm run dev` in your project
3. Use local endpoints for testing

## API Response Examples

### Prayer Times Response
```json
{
  "success": true,
  "data": {
    "date": "2025-01-01",
    "location": "doha",
    "coordinates": {
      "latitude": 25.2854,
      "longitude": 51.5310
    },
    "times": {
      "fajr": "05:15",
      "sunrise": "06:35",
      "dhuhr": "11:45",
      "asr": "14:30",
      "maghrib": "17:00",
      "isha": "18:30"
    },
    "method": "ISNA",
    "source": "Aladhan API - Islamic Prayer Times",
    "hijriDate": {
      "day": "10",
      "month": "Rajab",
      "year": "1446"
    }
  },
  "timezone": "Asia/Qatar"
}
```

### Sync Response
```json
{
  "success": true,
  "message": "Prayer times synced successfully",
  "recordsProcessed": 62,
  "timestamp": "2025-01-01T02:00:00.000Z"
}
```

## Troubleshooting

1. **404 Errors**: Update environment URLs after deployment
2. **CORS Issues**: Ensure your Cloud Functions allow cross-origin requests
3. **Timeout**: Check if functions are cold-starting (first request may be slow)
4. **Data Missing**: Run manual sync to populate Firestore

## Collection Updates

After deployment, update these URLs in your environment:
```bash
# Get your actual URLs after deployment
gcloud functions describe waqf-api --region=me-central1 --gen2 --format="value(serviceConfig.uri)"
gcloud functions describe waqf-sync --region=me-central1 --gen2 --format="value(serviceConfig.uri)"
```