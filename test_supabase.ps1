$r = Invoke-WebRequest -Uri 'https://ademincolrrhh.netlify.app/js/app.js' -UseBasicParsing
$lines = $r.Content -split "`n"
Write-Host "Total lines: $($lines.Count)"
Write-Host "--- Lines 755-770 ---"
for ($i = 754; $i -lt 770 -and $i -lt $lines.Count; $i++) {
    Write-Host "$($i+1): $($lines[$i])"
}
