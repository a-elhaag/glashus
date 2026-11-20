locals {
  api_project_roles = toset([
    "roles/datastore.user",
    "roles/aiplatform.user",
    "roles/dlp.user",
    "roles/secretmanager.secretAccessor",
    "roles/iam.serviceAccountTokenCreator",
  ])

  scanner_project_roles = toset([
    "roles/datastore.user",
    "roles/dlp.user",
  ])
}

resource "google_service_account" "api" {
  account_id   = "glashus-api"
  project      = var.project_id
  display_name = "Glashus API Service Account"
  description  = "Cloud Run API runtime SA for Glashus ${var.environment}"

  depends_on = [google_project_service.apis["iam.googleapis.com"]]
}

resource "google_service_account" "scanner" {
  account_id   = "glashus-scanner"
  project      = var.project_id
  display_name = "Glashus Scanner Service Account"
  description  = "Cloud Run ClamAV and DLP scanner SA for Glashus ${var.environment}"

  depends_on = [google_project_service.apis["iam.googleapis.com"]]
}

resource "google_project_iam_member" "api_roles" {
  for_each = local.api_project_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "scanner_roles" {
  for_each = local.scanner_project_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_storage_bucket_iam_member" "api_quarantine" {
  bucket = google_storage_bucket.quarantine.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "api_clean" {
  bucket = google_storage_bucket.clean.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "scanner_quarantine" {
  bucket = google_storage_bucket.quarantine.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_storage_bucket_iam_member" "scanner_clean" {
  bucket = google_storage_bucket.clean.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.scanner.email}"
}

# Hard rule: only Cloud Run runtime service accounts may encrypt/decrypt with master-kek; no human IAM bindings.
resource "google_kms_crypto_key_iam_member" "api_kms" {
  crypto_key_id = google_kms_crypto_key.master_kek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.api.email}"
}

resource "google_kms_crypto_key_iam_member" "scanner_kms" {
  crypto_key_id = google_kms_crypto_key.master_kek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.scanner.email}"
}
