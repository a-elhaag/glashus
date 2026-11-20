variable "project_id" {
  description = "Google Cloud project ID for Glashus."
  type        = string
}

variable "region" {
  description = "Primary GCP region for regional resources (us-central1 stays in US free tier)."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment name (dev or prod)."
  type        = string
  default     = "dev"
}

variable "cors_origins" {
  description = "Allowed web origins for direct signed-URL uploads and downloads."
  type        = list(string)
  default     = ["http://localhost:3000", "http://127.0.0.1:3000"]
}
