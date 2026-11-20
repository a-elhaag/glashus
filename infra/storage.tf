resource "google_storage_bucket" "quarantine" {
  name                        = "${var.project_id}-quarantine"
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  encryption {
    customer_supplied_encryption_enforcement_config {
      restriction_mode = "FullyRestricted"
    }
    customer_managed_encryption_enforcement_config {
      restriction_mode = "NotRestricted"
    }
    google_managed_encryption_enforcement_config {
      restriction_mode = "NotRestricted"
    }
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  lifecycle_rule {
    action {
      type = "AbortIncompleteMultipartUpload"
    }
    condition {
      age = 1
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 1
    }
  }

  cors {
    origin          = var.cors_origins
    method          = ["PUT", "POST", "GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "x-goog-resumable", "ETag"]
    max_age_seconds = 3600
  }

  labels = {
    app        = "glashus"
    env        = var.environment
    role       = "quarantine"
    data-class = "ugc"
  }

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

resource "google_storage_bucket" "clean" {
  name                        = "${var.project_id}-clean"
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  encryption {
    customer_supplied_encryption_enforcement_config {
      restriction_mode = "FullyRestricted"
    }
    customer_managed_encryption_enforcement_config {
      restriction_mode = "NotRestricted"
    }
    google_managed_encryption_enforcement_config {
      restriction_mode = "NotRestricted"
    }
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  lifecycle_rule {
    action {
      type = "AbortIncompleteMultipartUpload"
    }
    condition {
      age = 7
    }
  }

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Content-Disposition", "ETag"]
    max_age_seconds = 3600
  }

  labels = {
    app        = "glashus"
    env        = var.environment
    role       = "clean"
    data-class = "sensitive"
  }

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}
