param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $ReleaseDirectory
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
$expected = @("CodeMax-x64.zip", "CodeMax-x64-baseline.zip", "CodeMax-Setup-x64.exe", "SHA256SUMS.txt")
$actual = @(Get-ChildItem -LiteralPath $root -File | ForEach-Object Name | Sort-Object)
$missing = @($expected | Where-Object { $_ -notin $actual })
if ($missing.Count) { throw "Missing release artifacts: $($missing -join ', ')" }
$unexpected = @($actual | Where-Object { $_ -notin $expected })
if ($unexpected.Count) { throw "Unexpected release artifacts: $($unexpected -join ', ')" }

$allowedZipMembers = @("codemax.exe", "LICENSE", "README.txt", "THIRD_PARTY_NOTICES.md")
foreach ($archive in @("CodeMax-x64.zip", "CodeMax-x64-baseline.zip")) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $root $archive))
  try {
    $members = @($zip.Entries | ForEach-Object FullName | Sort-Object)
    if ((Compare-Object $members $allowedZipMembers -SyncWindow 0)) { throw "Unexpected ZIP members in $archive" }
  }
  finally { $zip.Dispose() }
}

$hashes = @{}
Get-Content -LiteralPath (Join-Path $root "SHA256SUMS.txt") | ForEach-Object {
  if ($_ -notmatch '^([A-Fa-f0-9]{64})  (CodeMax-(?:x64|x64-baseline)\.zip|CodeMax-Setup-x64\.exe)$') { throw "Invalid SHA256SUMS.txt entry: $_" }
  $hashes[$matches[2]] = $matches[1].ToUpperInvariant()
}
foreach ($file in @("CodeMax-x64.zip", "CodeMax-x64-baseline.zip", "CodeMax-Setup-x64.exe")) {
  if (-not $hashes.ContainsKey($file)) { throw "SHA256SUMS.txt is missing $file" }
  $actualHash = (Get-FileHash -LiteralPath (Join-Path $root $file) -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($actualHash -ne $hashes[$file]) { throw "SHA-256 mismatch for $file" }
}

Write-Host "Verified CodeMax release artifacts in $root"
