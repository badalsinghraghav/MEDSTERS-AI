# MedSters AI - Google Cloud Run Deployment Script

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MedSters AI - Google Cloud Run Deployer  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure user is aware of the Project ID vs API key difference
$PROJECT_ID = Read-Host "Enter your Google Cloud Project ID [Default: kagglebadl]"
if (-not $PROJECT_ID) {
    $PROJECT_ID = "kagglebadl"
}

# Warn if they input the Gemini API Key by accident
if ($PROJECT_ID.StartsWith("AQ.")) {
    Write-Host ""
    Write-Host "WARNING: You entered a string starting with 'AQ.'. This looks like a Gemini API key." -ForegroundColor Yellow
    Write-Host "A Google Cloud Project ID is the ID of your project on the Google Cloud Console." -ForegroundColor Yellow
    Write-Host "Please check console.cloud.google.com to find your Project ID." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Do you still want to proceed with this Project ID? (y/n)"
    if ($confirm -ne "y") {
        exit 1
    }
}

# Attempt to load GEMINI_API_KEY from local ignored .env file
$GEMINI_API_KEY = $null
if (Test-Path ".env") {
    $env_content = Get-Content ".env"
    foreach ($line in $env_content) {
        if ($line -match '^GEMINI_API_KEY\s*=\s*"(.*)"') {
            $GEMINI_API_KEY = $Matches[1]
            break
        }
        elseif ($line -match '^GEMINI_API_KEY\s*=\s*(.*)') {
            $GEMINI_API_KEY = $Matches[1]
            break
        }
    }
}

if (-not $GEMINI_API_KEY) {
    Write-Host "No GEMINI_API_KEY found in .env." -ForegroundColor Yellow
    $GEMINI_API_KEY = Read-Host "Enter your Gemini API Key (from Google AI Studio)"
    if (-not $GEMINI_API_KEY) {
        Write-Error "Gemini API Key is required to deploy this application."
        exit 1
    }
}

# Run gcloud auth login to authenticate
Write-Host "Checking Google Cloud authentication status..." -ForegroundColor Green
gcloud auth login

# Set active project
Write-Host "Setting active project to: $PROJECT_ID..." -ForegroundColor Green
gcloud config set project $PROJECT_ID

# Enable GCP Services
Write-Host "Enabling Google Cloud services (Cloud Run, Cloud Build, Artifact Registry)..." -ForegroundColor Green
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Deploy to Cloud Run
Write-Host "Deploying to Google Cloud Run (us-central1)..." -ForegroundColor Green
gcloud run deploy medsters-ai `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars="GEMINI_API_KEY=$GEMINI_API_KEY"

Write-Host ""
Write-Host "Deployment process complete!" -ForegroundColor Cyan
