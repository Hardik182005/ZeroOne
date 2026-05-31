# ZeroOne — GCP Initial Setup Script (run ONCE)
# Prerequisites: gcloud CLI installed and logged in (`gcloud auth login`)
# Usage: .\gcp-setup.ps1 -ProjectId "your-gcp-project-id"

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId
)

$Region   = "asia-south1"
$RepoName = "zeroone"
$Service  = "zeroone"

Write-Host "`n=== Setting GCP project ===" -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "`n=== Enabling required APIs ===" -ForegroundColor Cyan
gcloud services enable `
    run.googleapis.com `
    artifactregistry.googleapis.com `
    cloudbuild.googleapis.com `
    secretmanager.googleapis.com

Write-Host "`n=== Creating Artifact Registry repo ===" -ForegroundColor Cyan
gcloud artifacts repositories create $RepoName `
    --repository-format=docker `
    --location=$Region `
    --description="ZeroOne app images"

Write-Host "`n=== Configuring Docker auth ===" -ForegroundColor Cyan
gcloud auth configure-docker "$Region-docker.pkg.dev"

Write-Host "`n=== Granting Cloud Build permissions ===" -ForegroundColor Cyan
$ProjectNumber = (gcloud projects describe $ProjectId --format="value(projectNumber)")
$CbSa = "$ProjectNumber@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$CbSa" `
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$CbSa" `
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$CbSa" `
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$CbSa" `
    --role="roles/artifactregistry.writer"

Write-Host "`n=== Creating secrets in Secret Manager ===" -ForegroundColor Cyan
Write-Host "Enter each secret value when prompted. Leave blank to skip (set it later)." -ForegroundColor Yellow

function Create-Secret {
    param([string]$Name, [string]$EnvHint)
    $val = Read-Host "  $Name ($EnvHint)"
    if ($val) {
        $val | gcloud secrets create $Name --data-file=- --replication-policy=automatic 2>$null
        if (-not $?) {
            # Secret exists — add new version
            $val | gcloud secrets versions add $Name --data-file=-
        }
        Write-Host "  [OK] $Name" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $Name — set it later with: gcloud secrets versions add $Name --data-file=-" -ForegroundColor Yellow
    }
}

Create-Secret "GROQ_API_KEY"          "from Groq console"
Create-Secret "GEMINI_API_KEY"        "from Google AI Studio"
Create-Secret "ELEVENLABS_API_KEY"    "from ElevenLabs dashboard"
Create-Secret "ELEVENLABS_VOICE_ID"   "e.g. pNInz6obpgDQGcFmaJgB"
Create-Secret "ANAKIN_API_KEY"        "from app.anakin.ai"
Create-Secret "REDIS_URL"             "e.g. rediss://user:pass@host:6379 (Upstash recommended)"
Create-Secret "CORS_ORIGINS"          "leave blank for now — set after first deploy"

Write-Host "`n=== First manual deploy (before CI/CD is wired) ===" -ForegroundColor Cyan
$BuildNow = Read-Host "Build & deploy now? (y/n)"
if ($BuildNow -eq "y") {
    gcloud builds submit `
        --config=cloudbuild.yaml `
        --substitutions=_REGION=$Region `
        .

    $ServiceUrl = (gcloud run services describe $Service --region=$Region --format="value(status.url)")
    Write-Host "`nDeployed at: $ServiceUrl" -ForegroundColor Green

    Write-Host "`n=== Updating CORS_ORIGINS with real URL ===" -ForegroundColor Cyan
    $ServiceUrl | gcloud secrets versions add CORS_ORIGINS --data-file=-

    # Redeploy with correct CORS
    gcloud run services update $Service `
        --region=$Region `
        --update-secrets=CORS_ORIGINS=CORS_ORIGINS:latest
}

Write-Host @"

=== DONE ===

Next step — connect Cloud Build to GitHub for auto-deploy on push:
  Cloud Console → Cloud Build → Triggers → Connect Repository → GitHub
  Trigger: Push to branch 'main', config file 'cloudbuild.yaml'

"@ -ForegroundColor Green
