resource "google_artifact_registry_repository" "glashus" {
  project       = var.project_id
  location      = var.region
  repository_id = "glashus"
  description   = "Glashus ${var.environment} container images"
  format        = "DOCKER"

  labels = {
    app = "glashus"
    env = var.environment
  }

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}
