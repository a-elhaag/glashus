# Glashus Infrastructure (`infra/`)

Terraform configuration for the Glashus GCP environment (`glashus-dev` / `glashus-prod`).

> Note: `terraform` is not installed in the default agent environment; install it locally with `brew install terraform` before running `terraform init` / `plan` / `apply`.

## Provisioned Dev Resources

- **APIs (`apis.tf`)**: Cloud Run, Firestore, Cloud Storage, Cloud KMS, Sensitive Data Protection (`dlp`), Vertex AI (`aiplatform`), Eventarc, Secret Manager, Cloud Scheduler, Artifact Registry, Firebase, Identity Toolkit, IAM, IAM Credentials, Cloud Build.
- **Storage (`storage.tf`)**: Two private buckets in `us-central1` (`<project_id>-quarantine` and `<project_id>-clean`) with UBLA, Public Access Prevention enforced, CSEK restricted, 7-day soft delete, lifecycle cleanup rules, and browser CORS for signed URLs.
- **Database (`firestore.tf`)**: `(default)` Firestore Native Standard database in `us-central1` (US Always Free tier). Security rules live in [`../firestore.rules`](../firestore.rules).
- **Encryption (`kms.tf`)**: Key ring `glashus-<env>` and software symmetric KEK `master-kek` in `us-central1`.
- **IAM (`iam.tf`)**: Least-privilege service accounts `glashus-api` and `glashus-scanner`. Only Cloud Run runtime service accounts hold `roles/cloudkms.cryptoKeyEncrypterDecrypter` on `master-kek`.
- **Registry (`artifact_registry.tf`)**: Docker repository `glashus` in `us-central1`.

## Adopting Existing `glashus-dev` Resources into Terraform State

Copy [`environments/dev.tfvars.example`](environments/dev.tfvars.example) to `environments/dev.tfvars` and initialize Terraform:

```bash
cd infra
terraform init
```

Import the resources already provisioned via `gcloud`:

```bash
terraform import -var-file=environments/dev.tfvars google_storage_bucket.quarantine glashus-dev-quarantine
terraform import -var-file=environments/dev.tfvars google_storage_bucket.clean glashus-dev-clean
terraform import -var-file=environments/dev.tfvars google_firestore_database.default "projects/glashus-dev/databases/(default)"
terraform import -var-file=environments/dev.tfvars google_kms_key_ring.glashus "projects/glashus-dev/locations/us-central1/keyRings/glashus-dev"
terraform import -var-file=environments/dev.tfvars google_kms_crypto_key.master_kek "projects/glashus-dev/locations/us-central1/keyRings/glashus-dev/cryptoKeys/master-kek"
terraform import -var-file=environments/dev.tfvars google_service_account.api "projects/glashus-dev/serviceAccounts/glashus-api@glashus-dev.iam.gserviceaccount.com"
terraform import -var-file=environments/dev.tfvars google_service_account.scanner "projects/glashus-dev/serviceAccounts/glashus-scanner@glashus-dev.iam.gserviceaccount.com"
terraform import -var-file=environments/dev.tfvars google_artifact_registry_repository.glashus "projects/glashus-dev/locations/us-central1/repositories/glashus"
```

Then run `terraform plan -var-file=environments/dev.tfvars` to verify drift before applying any remaining IAM/API state.
