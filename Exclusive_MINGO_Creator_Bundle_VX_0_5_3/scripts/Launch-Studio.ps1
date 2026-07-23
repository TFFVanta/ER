$Root = Split-Path -Parent $PSScriptRoot
$Studio = Join-Path $Root "studio"
function Get-FreePort {
  for ($p=8787; $p -le 8899; $p++) {
    try {
      $l=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$p)
      $l.Start(); $l.Stop(); return $p
    } catch {}
  }
  throw "No free local port found."
}
$Port=Get-FreePort
$Url="http://127.0.0.1:$Port"
$Python=Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) {$Python=Get-Command py -ErrorAction SilentlyContinue}
if ($Python) {
  Start-Process $Url
  Push-Location $Studio
  try {
    if ($Python.Name -eq "py.exe") { & py -m http.server $Port --bind 127.0.0.1 }
    else { & python -m http.server $Port --bind 127.0.0.1 }
  } finally { Pop-Location }
} else {
  Start-Process (Join-Path $Studio "index.html")
}
