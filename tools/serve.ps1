# Mali statični HTTP server za lokalni razvoj (Windows bez Node/Pythona).
# Pokreće ga Claude Preview preko .claude/launch.json — nije dio deploya.
param([int]$Port = 8344)

$root = Split-Path -Parent $PSScriptRoot
$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.js'='text/javascript; charset=utf-8'; '.json'='application/json'
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'
  '.ico'='image/x-icon'; '.ttf'='font/ttf'; '.txt'='text/plain'; '.xml'='text/xml'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
  if ($path -eq '/') { $path = '/index.html' }
  # Debug upload: POST /upload sprema body u tools/_upload.bin (samo lokalni dev)
  if ($ctx.Request.HttpMethod -eq 'POST' -and $path -eq '/upload') {
    $ms = New-Object IO.MemoryStream
    $ctx.Request.InputStream.CopyTo($ms)
    [IO.File]::WriteAllBytes((Join-Path $root 'tools\_upload.bin'), $ms.ToArray())
    $ctx.Response.StatusCode = 200
    $ctx.Response.Close()
    continue
  }
  $file = Join-Path $root ($path -replace '/', '\')
  $full = [IO.Path]::GetFullPath($file)
  if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full).ToLower()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
