# Waqf - Qatar Prayer Times API

Accurate prayer times API for Qatar using reliable Islamic calculation methods. Built serverless on Google Cloud Platform.

## Features

- ✅ ISNA calculation method for accurate timings
- ✅ Aladhan API integration (reliable Islamic prayer times service)
- ✅ Serverless architecture (GCP Cloud Functions)
- ✅ Automated daily data sync
- ✅ Firestore database storage
- ✅ Cloud Storage backups
- ✅ CDN + Load Balancer
- ✅ Multiple API endpoints

## Architecture

```
Internet → Load Balancer → CDN → Cloud Functions → Firestore
                                      ↓
                              Cloud Storage (Backups)
                                      ↑
                              Cloud Scheduler (Daily Sync)
```

## API Endpoints

### Get Today's Prayer Times

```
GET /prayer-times?date=2025-01-01&location=doha
```

### Get Monthly Prayer Times

```
GET /month?month=1&year=2025&location=doha
```

### Get Next Prayer

```
GET /next?location=doha
```

### Health Check

```
GET /health
```

## Response Format

### Prayer Times Response

```json
{
  "success": true,
  "data": {
    "date": "2025-01-01",
    "location": "doha",
    "coordinates": {
      "latitude": 25.2854,
      "longitude": 51.531
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
    },
    "lastUpdated": "2025-01-01T02:00:00.000Z"
  },
  "timezone": "Asia/Qatar"
}
```

### Next Prayer Response

```json
{
  "success": true,
  "data": {
    "nextPrayer": "Maghrib",
    "time": "17:00",
    "currentTime": "16:45",
    "date": "2025-01-01"
  },
  "timezone": "Asia/Qatar"
}
```

## Deployment

### Prerequisites

- Google Cloud SDK installed
- GCP project with billing enabled
- Required APIs enabled (done automatically by deploy script)

### Quick Deploy

```bash
chmod +x deploy.sh
./deploy.sh your-gcp-project-id me-central1
```

### Manual Deploy

```bash
# Install dependencies
npm install

# Deploy functions
npm run deploy
npm run deploy-sync

# Set up infrastructure with Terraform (optional)
cd terraform
terraform init
terraform plan -var="project_id=your-project-id"
terraform apply
```

## Configuration

### Data Source Configuration

The system uses the Aladhan API with ISNA calculation method for accurate prayer times:

- **Coordinates**: Doha, Qatar (25.2854°N, 51.5310°E)
- **Method**: ISNA (Islamic Society of North America)
- **Timezone**: Asia/Qatar
- **API**: http://api.aladhan.com/v1/calendar

No additional configuration needed - the API provides reliable, calculated prayer times.

### Automated Sync

The system automatically syncs prayer times daily at 2 AM Qatar time. Manual sync available via:

```bash
curl -X POST https://REGION-PROJECT.cloudfunctions.net/waqf-sync
```

## Development

```bash
# Local development
npm run dev

# Test locally
curl http://localhost:8080/prayer-times

# Run tests
npm test
```

## Data Storage

- **Firestore**: Real-time prayer times data
- **Cloud Storage**: Daily backups and source code
- **Document Structure**:
  ```
  prayer-times/{location-date}
  ├── date: "2025-01-01"
  ├── location: "doha"
  ├── times: { fajr, sunrise, dhuhr, asr, maghrib, isha }
  ├── source: "Ministry of Awqaf Qatar"
  └── lastUpdated: timestamp
  ```

## Monitoring

- Cloud Functions logs: `gcloud functions logs read waqf-api`
- Sync logs: `gcloud functions logs read waqf-sync`
- Firestore usage: GCP Console → Firestore
- Storage usage: GCP Console → Cloud Storage

## Calculation Method

The system uses the ISNA (Islamic Society of North America) calculation method, which is widely accepted and provides accurate prayer times for Qatar. The calculations are based on:

- **Fajr Angle**: 15°
- **Isha Angle**: 15°
- **Madhab**: Shafi (for Asr calculation)
- **High Latitude Rule**: Middle of the Night

This method provides consistent, reliable timings without the need for manual adjustments.

## Cost Optimization

- Functions scale to zero when not in use
- Firestore charged per read/write
- Storage costs minimal for backups
- CDN reduces function invocations
- Estimated cost: $5-20/month for moderate usage

## Support

For issues with official timing data, contact Ministry of Awqaf Qatar directly. For technical issues, check the logs and ensure the scraping selectors match the current website structure.
