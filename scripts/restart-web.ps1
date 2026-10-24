# Hentikan `next dev` :3000 milik task IDX-Web.
#
# Kenapa ada: `run-hidden.vbs` melepas proses dev, jadi `Stop-ScheduledTask`
# tidak menyentuhnya dan shell biasa ditolak ("Access is denied"). Instance task
# berikutnya boleh menghentikannya -- pola yang sama dengan restart-api.ps1.
# Wajib untuk `next build`: repo ini melarang build selama `next dev` hidup di
# :3000 (dua-duanya memakai `.next`).
#
# Dua pemicu:
#  1. `_restart-web.flag` -> hentikan, lalu start-web.bat menyalakan lagi.
#  2. `_stop-web.flag`    -> hentikan dan JANGAN nyalakan (dipakai `next build`).
#     Flag ini sengaja tidak dihapus skrip: pemilik yang menghapus setelah build.
# Tanpa flag: hanya membuang proses yatim kalau :3000 tidak melayani.
#
# Jejak tiap eksekusi ditulis ke logs\_restart-web.log.

$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$flagUlang = Join-Path $root '_restart-web.flag'
$flagStop = Join-Path $root '_stop-web.flag'
$jejak = Join-Path $root 'logs\_restart-web.log'

function Catat([string]$pesan) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $pesan" |
        Out-File -FilePath $jejak -Append -Encoding utf8
}

function Pendengar {
    try {
        return @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop)[0].OwningProcess
    }
    catch {
        return $null
    }
}

# Simpan sebagai boolean terpisah: variabel path-nya masih dipakai untuk
# menghapus flag. Menimpa $flagUlang dengan hasil Test-Path dulu membuat
# `Remove-Item $flagUlang` menghapus `$true`, jadi flag tidak pernah hilang.
$adaUlang = Test-Path $flagUlang
$adaStop = Test-Path $flagStop
$pidDev = Pendengar

if (-not $adaUlang -and -not $adaStop -and $null -ne $pidDev) {
    Catat 'tidak ada flag dan :3000 melayani - tidak ada yang dihentikan'
    exit 0
}

if ($adaStop) { Catat '_stop-web.flag ada - :3000 dihentikan dan tidak dinyalakan' }
elseif ($adaUlang) { Catat '_restart-web.flag ada - :3000 dihentikan lalu dinyalakan lagi' }
else { Catat ':3000 tidak melayani - buang proses dev yatim' }

# Hentikan pemegang port, ulangi sampai port benar-benar bebas: worker `next`
# bisa langsung mewarisi listener kalau hanya proses induk yang dibunuh.
for ($i = 0; $i -lt 10; $i++) {
    $pidDev = Pendengar
    if ($null -eq $pidDev) { break }
    try {
        Stop-Process -Id $pidDev -Force -ErrorAction Stop
        Catat "dihentikan PID $pidDev"
    }
    catch {
        Catat "GAGAL menghentikan PID $pidDev`: $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 500
}

$bebas = $null -eq (Pendengar)
Catat "port 3000 bebas: $bebas"

if ($adaUlang) {
    Remove-Item $flagUlang -Force -ErrorAction SilentlyContinue
    Catat 'flag _restart-web.flag dihapus'
}

if (-not $bebas) { exit 2 }
exit 0
