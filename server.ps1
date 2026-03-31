param(
    [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8080 })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PublicRoot = Join-Path $Root "public"
$DataRoot = Join-Path $Root "data"
$UploadsRoot = Join-Path $DataRoot "uploads"
$JobsRoot = Join-Path $DataRoot "jobs"
$ModelsRoot = Join-Path $Root "models"
$HeaderDelimiter = [byte[]](13, 10, 13, 10)
$FfmpegPath = (Get-Command ffmpeg -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
$WhisperExecutablePath = if ($env:WHISPER_CPP_EXE) {
    $env:WHISPER_CPP_EXE
} else {
    @(
        (Get-Command whisper-cli -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Get-Command whisper-cli.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Get-Command main -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Get-Command main.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1
}
$WhisperModelPath = if ($env:WHISPER_MODEL_PATH) { $env:WHISPER_MODEL_PATH } else { Join-Path $ModelsRoot "ggml-base.en.bin" }

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        [void](New-Item -ItemType Directory -Path $Path -Force)
    }
}

function Initialize-App {
    Ensure-Directory -Path $DataRoot
    Ensure-Directory -Path $UploadsRoot
    Ensure-Directory -Path $JobsRoot
    Ensure-Directory -Path $ModelsRoot
}

function UrlDecode {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    return [System.Uri]::UnescapeDataString($Value.Replace("+", " "))
}

function Get-ContentTypeForFile {
    param([string]$Path)

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".js" { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".svg" { return "image/svg+xml" }
        ".png" { return "image/png" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".ico" { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

function To-JsonBytes {
    param($Body)

    $json = $Body | ConvertTo-Json -Depth 10
    return [System.Text.Encoding]::UTF8.GetBytes($json)
}

function Get-StatusText {
    param([int]$StatusCode)

    switch ($StatusCode) {
        200 { return "OK" }
        201 { return "Created" }
        400 { return "Bad Request" }
        404 { return "Not Found" }
        405 { return "Method Not Allowed" }
        500 { return "Internal Server Error" }
        default { return "OK" }
    }
}

function Write-HttpResponse {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [int]$StatusCode,
        [byte[]]$BodyBytes,
        [string]$ContentType = "application/json; charset=utf-8"
    )

    $stream = $Client.GetStream()
    $statusText = Get-StatusText -StatusCode $StatusCode
    $headerText = @(
        "HTTP/1.1 $StatusCode $statusText"
        "Content-Type: $ContentType"
        "Content-Length: $($BodyBytes.Length)"
        "Connection: close"
        ""
        ""
    ) -join "`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($BodyBytes.Length -gt 0) {
        $stream.Write($BodyBytes, 0, $BodyBytes.Length)
    }
    $stream.Flush()
}

function Write-JsonResponse {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [int]$StatusCode,
        [Parameter(Mandatory = $true)]$Body
    )

    $bytes = To-JsonBytes -Body $Body
    Write-HttpResponse -Client $Client -StatusCode $StatusCode -BodyBytes $bytes -ContentType "application/json; charset=utf-8"
}

function Write-TextResponse {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [int]$StatusCode,
        [Parameter(Mandatory = $true)][string]$Text,
        [string]$ContentType = "text/plain; charset=utf-8"
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    Write-HttpResponse -Client $Client -StatusCode $StatusCode -BodyBytes $bytes -ContentType $ContentType
}

function Index-OfBytePattern {
    param(
        [byte[]]$Buffer,
        [byte[]]$Pattern
    )

    if ($Buffer.Length -lt $Pattern.Length) {
        return -1
    }

    for ($i = 0; $i -le $Buffer.Length - $Pattern.Length; $i++) {
        $matched = $true
        for ($j = 0; $j -lt $Pattern.Length; $j++) {
            if ($Buffer[$i + $j] -ne $Pattern[$j]) {
                $matched = $false
                break
            }
        }
        if ($matched) {
            return $i
        }
    }

    return -1
}

function Slice-Bytes {
    param(
        [byte[]]$Buffer,
        [int]$Offset,
        [int]$Length
    )

    if ($Length -le 0) {
        return [byte[]]::new(0)
    }

    $result = [byte[]]::new($Length)
    [Array]::Copy($Buffer, $Offset, $result, 0, $Length)
    return $result
}

function Parse-QueryString {
    param([string]$RawQuery)

    $query = @{}
    if ([string]::IsNullOrWhiteSpace($RawQuery)) {
        return $query
    }

    foreach ($pair in $RawQuery.Split("&")) {
        if ([string]::IsNullOrWhiteSpace($pair)) {
            continue
        }

        $parts = $pair.Split("=", 2)
        $key = UrlDecode -Value $parts[0]
        $value = if ($parts.Length -gt 1) { UrlDecode -Value $parts[1] } else { "" }
        $query[$key] = $value
    }

    return $query
}

function Read-HttpRequest {
    param([Parameter(Mandatory = $true)]$Client)

    $stream = $Client.GetStream()
    $memory = [System.IO.MemoryStream]::new()
    $buffer = [byte[]]::new(8192)
    $headerIndex = -1

    while ($headerIndex -lt 0) {
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) {
            throw "Connection closed before request headers were received."
        }

        $memory.Write($buffer, 0, $read)
        $current = $memory.ToArray()
        $headerIndex = Index-OfBytePattern -Buffer $current -Pattern $HeaderDelimiter

        if ($memory.Length -gt 65536 -and $headerIndex -lt 0) {
            throw "Request headers are too large."
        }
    }

    $allBytes = $memory.ToArray()
    $headerBytes = Slice-Bytes -Buffer $allBytes -Offset 0 -Length $headerIndex
    $headerText = [System.Text.Encoding]::ASCII.GetString($headerBytes)
    $lines = $headerText -split "`r`n"
    if ($lines.Length -eq 0) {
        throw "Malformed request."
    }

    $requestLineParts = $lines[0].Split(" ")
    if ($requestLineParts.Length -lt 2) {
        throw "Invalid request line."
    }

    $method = $requestLineParts[0].ToUpperInvariant()
    $target = $requestLineParts[1]
    $headers = @{}

    foreach ($line in $lines[1..($lines.Length - 1)]) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $separatorIndex = $line.IndexOf(":")
        if ($separatorIndex -lt 0) {
            continue
        }

        $name = $line.Substring(0, $separatorIndex).Trim().ToLowerInvariant()
        $value = $line.Substring($separatorIndex + 1).Trim()
        $headers[$name] = $value
    }

    $contentLength = 0
    if ($headers.ContainsKey("content-length")) {
        $contentLength = [int]$headers["content-length"]
    }

    $bodyStart = $headerIndex + $HeaderDelimiter.Length
    $initialBodyLength = $allBytes.Length - $bodyStart
    $body = [byte[]]::new($contentLength)

    if ($contentLength -gt 0) {
        $copyLength = [Math]::Min($initialBodyLength, $contentLength)
        if ($copyLength -gt 0) {
            [Array]::Copy($allBytes, $bodyStart, $body, 0, $copyLength)
        }

        $offset = $copyLength
        while ($offset -lt $contentLength) {
            $read = $stream.Read($body, $offset, $contentLength - $offset)
            if ($read -le 0) {
                throw "Connection closed before request body completed."
            }
            $offset += $read
        }
    }

    $path = $target
    $queryString = ""
    $questionMark = $target.IndexOf("?")
    if ($questionMark -ge 0) {
        $path = $target.Substring(0, $questionMark)
        $queryString = $target.Substring($questionMark + 1)
    }

    return [PSCustomObject]@{
        Method  = $method
        Target  = $target
        Path    = $path
        Query   = Parse-QueryString -RawQuery $queryString
        Headers = $headers
        Body    = $body
    }
}

function Get-JobFilePath {
    param([string]$JobId)
    return Join-Path $JobsRoot "$JobId.json"
}

function Save-Job {
    param($Job)

    $Job.updatedAtUtc = [DateTime]::UtcNow.ToString("o")
    $path = Get-JobFilePath -JobId $Job.id
    $json = $Job | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($path, $json, [System.Text.Encoding]::UTF8)
}

function Load-Job {
    param([string]$JobId)

    $path = Get-JobFilePath -JobId $JobId
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return $null
    }

    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Get-AllJobs {
    $jobs = @()

    foreach ($file in Get-ChildItem -LiteralPath $JobsRoot -Filter *.json -File -ErrorAction SilentlyContinue) {
        try {
            $jobs += (Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json)
        }
        catch {
            Write-Warning "Skipping invalid job file: $($file.FullName)"
        }
    }

    return $jobs | Sort-Object -Property createdAtUtc -Descending
}

function New-JobRecord {
    param(
        [string]$OriginalFileName,
        [string]$ContentType,
        [long]$SizeBytes,
        [string]$StoredFileName
    )

    $jobId = [Guid]::NewGuid().ToString("N")
    $now = [DateTime]::UtcNow.ToString("o")

    return [PSCustomObject]@{
        id               = $jobId
        status           = "processing"
        originalFileName = $OriginalFileName
        storedFileName   = $StoredFileName
        contentType      = $ContentType
        sizeBytes        = $SizeBytes
        createdAtUtc     = $now
        updatedAtUtc     = $now
        transcriptText   = $null
        transcriptObject = $null
        error            = $null
    }
}

function Test-IsVideoFile {
    param(
        [string]$ContentType,
        [string]$FileName
    )

    if (-not [string]::IsNullOrWhiteSpace($ContentType) -and $ContentType.ToLowerInvariant().StartsWith("video/")) {
        return $true
    }

    $videoExtensions = @(".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg", ".mpg", ".m4v")
    return $videoExtensions -contains [System.IO.Path]::GetExtension($FileName).ToLowerInvariant()
}

function Test-IsWavInput {
    param(
        [string]$ContentType,
        [string]$FileName
    )

    if (-not [string]::IsNullOrWhiteSpace($ContentType) -and $ContentType.ToLowerInvariant() -eq "audio/wav") {
        return $true
    }

    return [System.IO.Path]::GetExtension($FileName).ToLowerInvariant() -eq ".wav"
}

function Get-PreparedTranscriptionSource {
    param(
        [Parameter(Mandatory = $true)][string]$InputPath,
        [Parameter(Mandatory = $true)][string]$OriginalFileName,
        [Parameter(Mandatory = $true)][string]$ContentType
    )

    if ((Test-IsWavInput -ContentType $ContentType -FileName $OriginalFileName) -and -not (Test-IsVideoFile -ContentType $ContentType -FileName $OriginalFileName)) {
        return [PSCustomObject]@{
            FilePath          = $InputPath
            FileName          = $OriginalFileName
            ContentType       = "audio/wav"
            GeneratedTempFile = $false
        }
    }

    if ([string]::IsNullOrWhiteSpace($FfmpegPath)) {
        throw "This file needs conversion to WAV before whisper.cpp can read it. Install ffmpeg, or upload a WAV file."
    }

    $wavPath = Join-Path $UploadsRoot ("{0}.wav" -f [Guid]::NewGuid().ToString("N"))
    & $FfmpegPath -y -i $InputPath -vn -acodec pcm_s16le -ar 16000 -ac 1 $wavPath | Out-Null

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $wavPath -PathType Leaf)) {
        throw "ffmpeg could not convert the uploaded file to WAV."
    }

    return [PSCustomObject]@{
        FilePath          = $wavPath
        FileName          = ([System.IO.Path]::GetFileNameWithoutExtension($OriginalFileName) + ".wav")
        ContentType       = "audio/wav"
        GeneratedTempFile = $true
    }
}

function Invoke-WhisperCppTranscription {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$JobId
    )

    if ([string]::IsNullOrWhiteSpace($WhisperExecutablePath) -or -not (Test-Path -LiteralPath $WhisperExecutablePath -PathType Leaf)) {
        throw "whisper.cpp executable not found. Set WHISPER_CPP_EXE or install whisper-cli."
    }

    if (-not (Test-Path -LiteralPath $WhisperModelPath -PathType Leaf)) {
        throw "whisper.cpp model file not found at '$WhisperModelPath'. Set WHISPER_MODEL_PATH to your .bin model."
    }

    $outputPrefix = Join-Path $JobsRoot ("transcript_" + $JobId)
    $outputTextPath = "$outputPrefix.txt"
    $stdoutPath = Join-Path $JobsRoot ("transcript_" + $JobId + ".stdout.log")
    $stderrPath = Join-Path $JobsRoot ("transcript_" + $JobId + ".stderr.log")

    if (Test-Path -LiteralPath $outputTextPath -PathType Leaf) {
        Remove-Item -LiteralPath $outputTextPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $stdoutPath -PathType Leaf) {
        Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $stderrPath -PathType Leaf) {
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }

    $commandLine = ('""{0}" -m "{1}" -f "{2}" --output-txt --output-file "{3}" 2>&1"' -f $WhisperExecutablePath, $WhisperModelPath, $FilePath, $outputPrefix)
    $processOutput = & cmd.exe /d /c $commandLine
    $exitCode = $LASTEXITCODE

    if ($processOutput) {
        ($processOutput | ForEach-Object { "$_" }) -join [Environment]::NewLine | Set-Content -LiteralPath $stderrPath
    }

    $transcriptText = ""
    if (Test-Path -LiteralPath $outputTextPath -PathType Leaf) {
        $transcriptText = (Get-Content -LiteralPath $outputTextPath -Raw).Trim()
    }

    if ([string]::IsNullOrWhiteSpace($transcriptText) -and $processOutput) {
        $segments = @()
        foreach ($line in $processOutput) {
            $textLine = "$line"
            if ($textLine -match '^\[[0-9:\.\s\-]+-->\s+[0-9:\.\s]+\]\s+(.*)$') {
                $segments += $Matches[1].Trim()
            }
        }
        $transcriptText = ($segments -join " ").Trim()
    }

    if ([string]::IsNullOrWhiteSpace($transcriptText)) {
        $combinedText = if ($processOutput) { ($processOutput | ForEach-Object { "$_" }) -join [Environment]::NewLine } else { "" }
        if ([string]::IsNullOrWhiteSpace($combinedText)) {
            $combinedText = "whisper.cpp exited with code $exitCode and did not produce transcript text."
        }
        throw $combinedText
    }

    return [PSCustomObject]@{
        text = $transcriptText
        engine = "whisper.cpp"
        modelPath = $WhisperModelPath
        exitCode = $exitCode
    }
}

function Handle-CreateTranscription {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [Parameter(Mandatory = $true)]$Request
    )

    $filename = $Request.Query["filename"]
    $contentType = $Request.Query["contentType"]

    if ([string]::IsNullOrWhiteSpace($filename)) {
        Write-JsonResponse -Client $Client -StatusCode 400 -Body @{ error = "Missing filename query parameter." }
        return
    }

    if ($Request.Body.Length -eq 0) {
        Write-JsonResponse -Client $Client -StatusCode 400 -Body @{ error = "Request body is empty." }
        return
    }

    if ([string]::IsNullOrWhiteSpace($contentType)) {
        $contentType = "application/octet-stream"
    }

    $safeName = [System.IO.Path]::GetFileName($filename)
    $storedFileName = "{0}_{1}" -f ([Guid]::NewGuid().ToString("N")), $safeName
    $filePath = Join-Path $UploadsRoot $storedFileName
    [System.IO.File]::WriteAllBytes($filePath, $Request.Body)

    $job = New-JobRecord -OriginalFileName $safeName -ContentType $contentType -SizeBytes $Request.Body.Length -StoredFileName $storedFileName
    Save-Job -Job $job

    $transcriptionSource = $null
    try {
        $transcriptionSource = Get-PreparedTranscriptionSource -InputPath $filePath -OriginalFileName $safeName -ContentType $contentType
        $localResult = Invoke-WhisperCppTranscription -FilePath $transcriptionSource.FilePath -JobId $job.id
        $job.status = "completed"
        $job.transcriptText = $localResult.text
        $job.transcriptObject = $localResult
        Save-Job -Job $job
        Write-JsonResponse -Client $Client -StatusCode 201 -Body $job
    }
    catch {
        $job.status = "failed"
        $job.error = $_.Exception.Message
        Save-Job -Job $job
        Write-JsonResponse -Client $Client -StatusCode 500 -Body $job
    }
    finally {
        if ($null -ne $transcriptionSource -and $transcriptionSource.GeneratedTempFile -and (Test-Path -LiteralPath $transcriptionSource.FilePath -PathType Leaf)) {
            Remove-Item -LiteralPath $transcriptionSource.FilePath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Handle-CreateTranscriptionFromUrl {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [Parameter(Mandatory = $true)]$Request
    )

    if ($Request.Body.Length -eq 0) {
        Write-JsonResponse -Client $Client -StatusCode 400 -Body @{ error = "Request body is empty." }
        return
    }

    $payload = $null
    try {
        $bodyText = [System.Text.Encoding]::UTF8.GetString($Request.Body)
        $payload = $bodyText | ConvertFrom-Json
    }
    catch {
        Write-JsonResponse -Client $Client -StatusCode 400 -Body @{ error = "Invalid JSON payload." }
        return
    }

    $mediaUrl = [string]$payload.mediaUrl
    $originalFileName = [string]$payload.originalFileName
    $jobId = [string]$payload.jobId
    $callbackUrl = [string]$payload.callbackUrl
    $callbackSecret = [string]$payload.callbackSecret

    if ([string]::IsNullOrWhiteSpace($mediaUrl) -or [string]::IsNullOrWhiteSpace($originalFileName) -or [string]::IsNullOrWhiteSpace($jobId)) {
        Write-JsonResponse -Client $Client -StatusCode 400 -Body @{ error = "Missing mediaUrl, originalFileName, or jobId." }
        return
    }

    $safeName = [System.IO.Path]::GetFileName($originalFileName)
    $storedFileName = "{0}_{1}" -f ([Guid]::NewGuid().ToString("N")), $safeName
    $filePath = Join-Path $UploadsRoot $storedFileName
    $downloadResponse = $null

    try {
        $downloadResponse = Invoke-WebRequest -Uri $mediaUrl -OutFile $filePath
        $contentType = "application/octet-stream"

        if ($null -ne $downloadResponse) {
            if ($downloadResponse.PSObject.Properties.Name -contains "Headers" -and $null -ne $downloadResponse.Headers) {
                $headerValue = $downloadResponse.Headers["Content-Type"]
                if (-not [string]::IsNullOrWhiteSpace([string]$headerValue)) {
                    $contentType = [string]$headerValue
                }
            }
            elseif ($downloadResponse.PSObject.Properties.Name -contains "Content" -and -not [string]::IsNullOrWhiteSpace([string]$downloadResponse.ContentType)) {
                $contentType = [string]$downloadResponse.ContentType
            }
        }

        $transcriptionSource = $null
        try {
            $transcriptionSource = Get-PreparedTranscriptionSource -InputPath $filePath -OriginalFileName $safeName -ContentType $contentType
            $localResult = Invoke-WhisperCppTranscription -FilePath $transcriptionSource.FilePath -JobId $jobId

            if (-not [string]::IsNullOrWhiteSpace($callbackUrl)) {
                Invoke-RestMethod -Method POST -Uri $callbackUrl -Headers @{ "x-worker-secret" = $callbackSecret } -ContentType "application/json" -Body (@{
                    jobId = $jobId
                    status = "COMPLETED"
                    transcriptText = $localResult.text
                    transcriptFormat = "text"
                } | ConvertTo-Json -Depth 6) | Out-Null
            }

            Write-JsonResponse -Client $Client -StatusCode 200 -Body @{
                success = $true
                jobId = $jobId
                status = "completed"
            }
        }
        finally {
            if ($null -ne $transcriptionSource -and $transcriptionSource.GeneratedTempFile -and (Test-Path -LiteralPath $transcriptionSource.FilePath -PathType Leaf)) {
                Remove-Item -LiteralPath $transcriptionSource.FilePath -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
        if (-not [string]::IsNullOrWhiteSpace($callbackUrl)) {
            try {
                Invoke-RestMethod -Method POST -Uri $callbackUrl -Headers @{ "x-worker-secret" = $callbackSecret } -ContentType "application/json" -Body (@{
                    jobId = $jobId
                    status = "FAILED"
                    errorMessage = $_.Exception.Message
                } | ConvertTo-Json -Depth 6) | Out-Null
            }
            catch {}
        }

        Write-JsonResponse -Client $Client -StatusCode 500 -Body @{
            success = $false
            jobId = $jobId
            error = $_.Exception.Message
        }
    }
    finally {
        if (Test-Path -LiteralPath $filePath -PathType Leaf) {
            Remove-Item -LiteralPath $filePath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Handle-ApiRequest {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [Parameter(Mandatory = $true)]$Request
    )

    $normalizedPath = if ([string]::IsNullOrWhiteSpace($Request.Path)) { "/" } else { $Request.Path.TrimEnd("/") }
    if ([string]::IsNullOrWhiteSpace($normalizedPath)) {
        $normalizedPath = "/"
    }

    if ($Request.Method -eq "GET" -and $normalizedPath -eq "/api/health") {
        Write-JsonResponse -Client $Client -StatusCode 200 -Body @{
            status = "ok"
            port = $Port
            provider = "whisper.cpp"
            whisperExecutable = $(if ($WhisperExecutablePath) { [string]$WhisperExecutablePath } else { "" })
            whisperModelPath = $WhisperModelPath
            hasWhisperExecutable = -not [string]::IsNullOrWhiteSpace($WhisperExecutablePath)
            hasWhisperModel = Test-Path -LiteralPath $WhisperModelPath -PathType Leaf
            hasFfmpeg = -not [string]::IsNullOrWhiteSpace($FfmpegPath)
        }
        return
    }

    if ($Request.Method -eq "GET" -and $normalizedPath -eq "/api/jobs") {
        Write-JsonResponse -Client $Client -StatusCode 200 -Body @(Get-AllJobs)
        return
    }

    if ($Request.Method -eq "GET" -and $normalizedPath.StartsWith("/api/jobs/")) {
        $jobId = $normalizedPath.Substring("/api/jobs/".Length)
        $job = Load-Job -JobId $jobId
        if ($null -eq $job) {
            Write-JsonResponse -Client $Client -StatusCode 404 -Body @{ error = "Job not found." }
            return
        }

        Write-JsonResponse -Client $Client -StatusCode 200 -Body $job
        return
    }

    if ($Request.Method -eq "POST" -and ($normalizedPath -eq "/api/transcriptions" -or $normalizedPath -eq "/transcriptions")) {
        Handle-CreateTranscription -Client $Client -Request $Request
        return
    }

    if ($Request.Method -eq "POST" -and ($normalizedPath -eq "/api/transcriptions/from-url" -or $normalizedPath -eq "/transcriptions/from-url")) {
        Handle-CreateTranscriptionFromUrl -Client $Client -Request $Request
        return
    }

    Write-JsonResponse -Client $Client -StatusCode 404 -Body @{ error = "API route not found." }
}

function Send-StaticFile {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $requested = if ([string]::IsNullOrWhiteSpace($Path) -or $Path -eq "/") {
        "index.html"
    } else {
        $Path.TrimStart("/")
    }

    $safeRelative = $requested -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $fullPath = Join-Path $PublicRoot $safeRelative

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        Write-TextResponse -Client $Client -StatusCode 404 -Text "Not found"
        return
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    Write-HttpResponse -Client $Client -StatusCode 200 -BodyBytes $bytes -ContentType (Get-ContentTypeForFile -Path $fullPath)
}

function Handle-Client {
    param([Parameter(Mandatory = $true)]$Client)

    try {
        $request = Read-HttpRequest -Client $Client
        if ($request.Path.StartsWith("/api/")) {
            Handle-ApiRequest -Client $Client -Request $request
        } else {
            Send-StaticFile -Client $Client -Path $request.Path
        }
    }
    catch {
        try {
            Write-JsonResponse -Client $Client -StatusCode 500 -Body @{ error = $_.Exception.Message }
        }
        catch {
            Write-Warning "Failed to return error response: $($_.Exception.Message)"
        }
    }
    finally {
        $Client.Close()
    }
}

Initialize-App

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

Write-Host ""
Write-Host "Transcript Studio running at http://localhost:$Port" -ForegroundColor Green
Write-Host "Uploads folder: $UploadsRoot"
Write-Host "Jobs folder:    $JobsRoot"
Write-Host "Provider:       whisper.cpp"
Write-Host "Executable:     $(if ($WhisperExecutablePath) { $WhisperExecutablePath } else { 'not found' })"
Write-Host "Model:          $WhisperModelPath"
Write-Host "ffmpeg:         $(if ($FfmpegPath) { $FfmpegPath } else { 'not found (WAV uploads work best until installed)' })"
Write-Host ""

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        Handle-Client -Client $client
    }
}
finally {
    $listener.Stop()
}
