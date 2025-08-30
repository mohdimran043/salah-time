#!/bin/bash

# Waqf Qatar Prayer Times - GCP Deployment Script

set -e

PROJECT_ID=${1:-"your-gcp-project-id"}
REGION=${2:-"me-central1"}

echo "🕌 Deploying Waqf Qatar Prayer Times API"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable compute.googleapis.com

# Create storage bucket for source code
BUCKET_NAME="${PROJECT_ID}-waqf-source"
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME/ || true

# Package and upload source code
echo "📦 Packaging source code..."
zip -r source.zip . -x "*.git*" "node_modules/*" "terraform/*"
gsutil cp source.zip gs://$BUCKET_NAME/

# Deploy Cloud Functions
echo "🚀 Deploying Cloud Functions..."

# API Function
gcloud functions deploy waqf-api \
    --gen2 \
    --runtime=nodejs18 \
    --region=$REGION \
    --source=. \
    --entry-point=api \
    --trigger-http \
    --allow-unauthenticated \
    --memory=256MB \
    --timeout=60s

# Sync Function
gcloud functions deploy waqf-sync \
    --gen2 \
    --runtime=nodejs18 \
    --region=$REGION \
    --source=. \
    --entry-point=sync \
    --trigger-http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=300s

# Create Firestore database
echo "🗄️ Setting up Firestore..."
gcloud firestore databases create --region=$REGION || true

# Create storage bucket for data
DATA_BUCKET="${PROJECT_ID}-waqf-qatar-data"
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$DATA_BUCKET/ || true

# Set up Cloud Scheduler for daily sync
echo "⏰ Setting up automated sync..."
gcloud scheduler jobs create http daily-prayer-sync \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/waqf-sync" \
    --http-method=POST \
    --time-zone="Asia/Qatar" || true

# Get function URLs
API_URL=$(gcloud functions describe waqf-api --region=$REGION --gen2 --format="value(serviceConfig.uri)")
SYNC_URL=$(gcloud functions describe waqf-sync --region=$REGION --gen2 --format="value(serviceConfig.uri)")

echo "✅ Deployment completed!"
echo ""
echo "📋 Service URLs:"
echo "API: $API_URL"
echo "Sync: $SYNC_URL"
echo ""
echo "🔗 Test endpoints:"
echo "Health: $API_URL/health"
echo "Prayer Times: $API_URL/prayer-times?date=2025-01-01"
echo "Manual Sync: $SYNC_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update sync.js with actual Ministry of Awqaf URL"
echo "2. Test the sync function: curl -X POST $SYNC_URL"
echo "3. Set up custom domain and SSL certificate"
echo "4. Configure CDN caching rules"

# Clean up
rm -f source.zip