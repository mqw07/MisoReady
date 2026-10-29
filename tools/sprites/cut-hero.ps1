# Cuts the large hero sprite (design/miso-hero-sprite.jpg) into src/assets/miso/hero.png.
# The source is a 1024px AI pixel-art image without a regular pixel grid, so it is
# area-averaged down to a width where the art reads as pixel art at 1:1.
# Usage: powershell -File tools/sprites/cut-hero.ps1 [-Width 224]
param([int]$Width = 224)
$root = Resolve-Path "$PSScriptRoot\..\.."
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Path "$PSScriptRoot\Seg.cs"

$src = Join-Path $root "design\miso-hero-sprite.jpg"
$out = Join-Path $root "src\assets\miso\hero.png"
$w = 0; $h = 0
$px = [Seg]::LoadResized($src, $Width, [ref]$w, [ref]$h)
$bg = [Seg]::BgColor($px, $w)
[Seg]::Cut($px, $w, $bg, 30, 0, 0, $w - 1, $h - 1, $out, 3)
$img = [System.Drawing.Image]::FromFile($out)
"hero.png {0}x{1}" -f $img.Width, $img.Height
$img.Dispose()

# Preview on the page canvas colour and the sky blue.
$prev = New-Object System.Drawing.Bitmap 520, 300
$g = [System.Drawing.Graphics]::FromImage($prev)
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#d9eef8"))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$i = [System.Drawing.Image]::FromFile($out)
$g.DrawImage($i, 10, 10, $i.Width, $i.Height)
$g.DrawImage($i, 270, 10, $i.Width, $i.Height)
$prev.Save((Join-Path $root "design\hero-preview.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$i.Dispose()
