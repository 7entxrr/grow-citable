# Script to import all environment variables from .env.local to Vercel preview
$envFile = Get-Content .env.local

foreach ($line in $envFile) {
    if ($line -match '^([^#].+?)=(.+)$') {
        $name = $matches[1]
        $value = $matches[2]
        
        # Skip empty values
        if ([string]::IsNullOrWhiteSpace($value)) { continue }
        
        # Skip VERCEL_OIDC_TOKEN as it's auto-generated
        if ($name -eq "VERCEL_OIDC_TOKEN") { continue }
        
        # Skip placeholder values
        if ($value -match 'YOUR_') { continue }
        
        # Skip SERPER_API_KEY as it's already added
        if ($name -eq "SERPER_API_KEY") { continue }
        
        Write-Host "Adding $name to preview..."
        cmd /c "echo $value | vercel env add $name preview"
    }
}
