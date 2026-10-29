# Detects the pixel grid of a large pixel-art image.
# Usage: powershell -File tools/sprites/grid.ps1 design/miso-hero-sprite.jpg
param([string]$Path = "design\miso-hero-sprite.jpg")
$root = Resolve-Path "$PSScriptRoot\..\.."
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Path "$PSScriptRoot\Seg.cs"
$w = 0; $h = 0
$px = [Seg]::Load((Join-Path $root $Path), [ref]$w, [ref]$h)
"{0}x{1}" -f $w, $h
$r = [Seg]::DetectGrid($px, $w, $h, 4, 16)
"best block={0} offsetX={1} offsetY={2} score={3}" -f $r[0], $r[1], $r[2], ($r[3] / 1000)
