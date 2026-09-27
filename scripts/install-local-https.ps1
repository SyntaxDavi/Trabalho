$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$certPath = Join-Path $projectDir 'certs\blog-cert.pem'
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
if (-not (Test-Path -LiteralPath $certPath)) { throw 'Gere o certificado com npm run tls:generate primeiro.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Execute este script em um PowerShell como administrador.' }
$cert = [Security.Cryptography.X509Certificates.X509Certificate2]::new($certPath)
if ($cert.Subject -notlike '*CN=blog-grupo.com*') { throw 'Certificado inesperado.' }
$lines = Get-Content -LiteralPath $hostsPath
$matching = @($lines | Where-Object { ($_ -split '#')[0] -match '(?i)(^|\s)blog-grupo\.com(\s|$)' })
if ($matching | Where-Object { $_ -notmatch '^\s*127\.0\.0\.1\s' }) { throw 'Já existe um mapeamento diferente para blog-grupo.com. Revise o arquivo hosts.' }
if ($matching.Count -eq 0) {
  Copy-Item -LiteralPath $hostsPath -Destination (Join-Path $projectDir 'certs\hosts-before-https.txt')
  Add-Content -LiteralPath $hostsPath -Value "`r`n127.0.0.1 blog-grupo.com # Blog Saber Seguro" -Encoding ascii
}
$store = [Security.Cryptography.X509Certificates.X509Store]::new('Root', 'LocalMachine')
try { $store.Open('ReadWrite'); $store.Add($cert) } finally { $store.Close() }
Write-Output "Domínio nominal instalado: blog-grupo.com -> 127.0.0.1"
Write-Output "Certificado confiável instalado (somente certificado público): $($cert.Thumbprint)"
