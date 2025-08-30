terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "me-central1" # Middle East (Doha)
}

# Storage bucket for data backups
resource "google_storage_bucket" "waqf_data" {
  name     = "${var.project_id}-waqf-qatar-data"
  location = var.region

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# Firestore database
resource "google_firestore_database" "waqf_db" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Function for API
resource "google_cloudfunctions2_function" "waqf_api" {
  name     = "waqf-api"
  location = var.region

  build_config {
    runtime     = "nodejs18"
    entry_point = "api"
    source {
      storage_source {
        bucket = google_storage_bucket.waqf_data.name
        object = "source.zip"
      }
    }
  }

  service_config {
    max_instance_count = 10
    available_memory   = "256M"
    timeout_seconds    = 60
  }
}

# Cloud Function for data sync
resource "google_cloudfunctions2_function" "waqf_sync" {
  name     = "waqf-sync"
  location = var.region

  build_config {
    runtime     = "nodejs18"
    entry_point = "sync"
    source {
      storage_source {
        bucket = google_storage_bucket.waqf_data.name
        object = "source.zip"
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "512M"
    timeout_seconds    = 300
  }
}

# Load Balancer
resource "google_compute_global_address" "waqf_ip" {
  name = "waqf-ip"
}

resource "google_compute_backend_service" "waqf_backend" {
  name        = "waqf-backend"
  protocol    = "HTTP"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.waqf_neg.id
  }
}

resource "google_compute_region_network_endpoint_group" "waqf_neg" {
  name                  = "waqf-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_function {
    function = google_cloudfunctions2_function.waqf_api.name
  }
}

# CDN
resource "google_compute_url_map" "waqf_url_map" {
  name            = "waqf-url-map"
  default_service = google_compute_backend_service.waqf_backend.id
}

resource "google_compute_target_https_proxy" "waqf_https_proxy" {
  name    = "waqf-https-proxy"
  url_map = google_compute_url_map.waqf_url_map.id
}

resource "google_compute_global_forwarding_rule" "waqf_forwarding_rule" {
  name       = "waqf-forwarding-rule"
  target     = google_compute_target_https_proxy.waqf_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.waqf_ip.address
}

# Cloud Scheduler for automated sync
resource "google_cloud_scheduler_job" "daily_sync" {
  name     = "daily-prayer-sync"
  region   = var.region
  schedule = "0 2 * * *" # Daily at 2 AM

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.waqf_sync.service_config[0].uri
  }
}

output "api_url" {
  value = google_cloudfunctions2_function.waqf_api.service_config[0].uri
}

output "sync_url" {
  value = google_cloudfunctions2_function.waqf_sync.service_config[0].uri
}

output "load_balancer_ip" {
  value = google_compute_global_address.waqf_ip.address
}