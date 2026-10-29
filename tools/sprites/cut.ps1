# Cuts the sprites the UI uses out of design/miso-sprite-sheet.jpg into transparent PNGs.
# Usage: powershell -File tools/sprites/cut.ps1
# Add more entries to $targets (see segment.ps1 for the coordinates) when new sprites are needed,
# for example the cosmetic variants in the shop phase.
$root = Resolve-Path "$PSScriptRoot\..\.."
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Path "$PSScriptRoot\Seg.cs"

$src = Join-Path $root "design\miso-sprite-sheet.jpg"
$outDir = Join-Path $root "src\assets\miso"
New-Item -ItemType Directory -Force $outDir | Out-Null

$targets = [ordered]@{
  idle      = 14, 40, 122, 188
  happy     = 136, 40, 243, 188
  sleeping  = 253, 40, 373, 188
  studying  = 385, 40, 521, 188
  success   = 529, 40, 654, 188
  avatar    = 21, 222, 95, 298
  sidebar   = 123, 222, 176, 298
  small     = 204, 222, 267, 298
  paw       = 290, 222, 337, 298
  coin      = 361, 222, 406, 298
  star      = 431, 222, 473, 298
  streak    = 502, 222, 541, 298
  heart     = 575, 222, 617, 298
  sparkle   = 648, 222, 688, 298
  plant     = 716, 222, 769, 298
  books     = 797, 222, 881, 298
  potplant  = 947, 332, 988, 414
}

$w = 0; $h = 0
$px = [Seg]::Load($src, [ref]$w, [ref]$h)
$bg = [Seg]::BgColor($px, $w)

foreach ($name in $targets.Keys) {
  $b = $targets[$name]
  [Seg]::Cut($px, $w, $bg, 26, $b[0], $b[1], $b[2], $b[3], (Join-Path $outDir "$name.png"))
}

# Contact sheet on the blue card colour so leftover halos are easy to spot.
$files = Get-ChildItem $outDir -Filter *.png
$sheet = New-Object System.Drawing.Bitmap 1100, 520
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#e1f1fa"))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$x = 10; $y = 10; $rowH = 0
foreach ($f in $files) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $dw = $img.Width * 2; $dh = $img.Height * 2
  if ($x + $dw -gt 1090) { $x = 10; $y += $rowH + 10; $rowH = 0 }
  $g.DrawImage($img, $x, $y, $dw, $dh)
  $x += $dw + 10; if ($dh -gt $rowH) { $rowH = $dh }
  "{0}  {1}x{2}" -f $f.Name, $img.Width, $img.Height
  $img.Dispose()
}
$sheet.Save((Join-Path $root "design\sprites-preview.png"), [System.Drawing.Imaging.ImageFormat]::Png)
