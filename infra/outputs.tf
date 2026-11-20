output "project_id" {
  description = "GCP project ID."
  value       = var.project_id
}

output "region" {
  description = "Primary GCP region."
  value       = var.region
}

output "quarantine_bucket" {
  description = "Private GCS quarantine bucket name."
  value       = google_storage_bucket.quarantine.name
}

output "clean_bucket" {
  description = "Private GCS clean encrypted chunks bucket name."
  value       = google_storage_bucket.clean.name
}

output "kms_key_id" {
  description = "Cloud KMS master KEK resource ID."
  value       = google_kms_crypto_key.master_kek.id
}

output "api_service_account_email" {
  description = "Cloud Run API service account email."
  value       = google_service_account.api.email
}

output "scanner_service_account_email" {
  description = "Cloud Run scanner service account email."
  value       = google_service_account.scanner.email
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository path."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.glashus.repository_id}"
}
