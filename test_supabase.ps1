$headers = @{
    'apikey' = 'sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W'
    'Authorization' = 'Bearer sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W'
}

# We can query Postgres functions or check what happens when we do an upsert via POST with Prefer: resolution=merge-duplicates
Write-Host "=== Test 1: POST single with resolution=merge-duplicates ==="
$single = @{
    id = [System.Guid]::NewGuid().ToString()
    nombre = "TEST UPSERT SINGLE"
    empresa = "ADC"
    estado = "ACTIVO"
}
try {
    $res = Invoke-RestMethod -Uri 'https://rxvfzskzoiauuiljyxmf.supabase.co/rest/v1/empleados' -Headers @{
        'apikey' = 'sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W'
        'Authorization' = 'Bearer sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W'
        'Content-Type' = 'application/json'
        'Prefer' = 'resolution=merge-duplicates'
    } -Method Post -Body (ConvertTo-Json @($single))
    Write-Host "Success Test 1!"
} catch {
    Write-Host "Error Test 1:" $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: " $reader.ReadToEnd()
    }
}
