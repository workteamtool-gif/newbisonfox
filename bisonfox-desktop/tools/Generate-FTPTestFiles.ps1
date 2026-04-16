# Generate-FTPTestFiles.ps1
# Creates 1000 files of various sizes for FTP testing.

$TargetDir = "C:\temp"
$TotalFiles = 1000

# Ensure the target directory exists
if (-not (Test-Path $TargetDir)) {
    Write-Host "Creating directory $TargetDir..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$Sizes = @(
    @{ Name = "5mb";  Bytes = 5MB },
    @{ Name = "1gb";  Bytes = 1GB },
    @{ Name = "10kb"; Bytes = 10KB }
)

Write-Host "Generating $TotalFiles files in $TargetDir..." -ForegroundColor Cyan
$Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

for ($i = 1; $i -le $TotalFiles; $i++) {
    # Cycle through the defined sizes
    $SizeInfo = $Sizes[($i - 1) % $Sizes.Count]
    
    # Create a unique filename
    $FileName = "testfile_$($i.ToString('0000'))_$($SizeInfo.Name).bin"
    $Path = Join-Path $TargetDir $FileName
    
    try {
        # Using .NET FileStream to quickly allocate file size without writing every byte
        # This is nearly instantaneous even for 1GB files.
        if (-not (Test-Path $Path)) {
            $File = [System.IO.File]::Create($Path)
            $File.SetLength($SizeInfo.Bytes)
            $File.Close()
        }
        
        if ($i % 100 -eq 0) {
            Write-Host "Progress: $i / $TotalFiles files created..."
        }
    }
    catch {
        Write-Error "Failed to create file $FileName: $($_.Exception.Message)"
        break
    }
}

$Stopwatch.Stop()
Write-Host "`nSuccess! Generated $TotalFiles files in $($Stopwatch.Elapsed.TotalSeconds.ToString('F2')) seconds." -ForegroundColor Green
Write-Host "Total space used: ~335 GB (Estimated)" -ForegroundColor Yellow
