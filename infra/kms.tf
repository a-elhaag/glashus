resource "google_kms_key_ring" "glashus" {
  name     = "glashus-${var.environment}"
  project  = var.project_id
  location = var.region

  depends_on = [google_project_service.apis["cloudkms.googleapis.com"]]
}

resource "google_kms_crypto_key" "master_kek" {
  name            = "master-kek"
  key_ring        = google_kms_key_ring.glashus.id
  purpose         = "ENCRYPT_DECRYPT"
  rotation_period = null

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  labels = {
    app = "glashus"
    env = var.environment
  }

  lifecycle {
    prevent_destroy = true
  }
}
