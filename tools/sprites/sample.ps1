# Prints reference colours from design/dashboard-reference.png (1024x783).
# Usage: powershell -File tools/sprites/sample.ps1
$root = Resolve-Path "$PSScriptRoot\..\.."
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap (Join-Path $root "design\dashboard-reference.png")

function Darkest($x0, $y0, $x1, $y1) {
  $best = $null; $bl = 999
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
    $c = $bmp.GetPixel($x, $y); $l = $c.R + $c.G + $c.B
    if ($l -lt $bl) { $bl = $l; $best = $c }
  } }
  "#{0:X2}{1:X2}{2:X2}" -f $best.R, $best.G, $best.B
}

$regions = [ordered]@{
  "greeting heading"   = 285, 105, 530, 140
  "hero subtitle"      = 285, 150, 625, 166
  "due title"          = 275, 235, 395, 258
  "due zero"           = 255, 295, 295, 340
  "no cards text"      = 257, 352, 410, 370
  "button text"        = 308, 400, 405, 418
  "miso title"         = 775, 255, 830, 275
  "pill text"          = 745, 303, 800, 320
  "stats text"         = 740, 348, 830, 365
  "continue title"     = 275, 487, 440, 505
  "course name"        = 300, 540, 410, 560
  "courses title"      = 268, 632, 400, 652
  "course row name"    = 300, 690, 380, 708
  "course meta"        = 300, 714, 440, 730
  "nav label home"     = 66, 108, 110, 128
  "nav label study"    = 66, 164, 110, 182
  "nav icon study"     = 24, 160, 52, 186
  "nav icon home"      = 24, 106, 52, 130
  "motto text"         = 40, 668, 135, 730
  "logo text"          = 85, 30, 160, 62
  "due border (orange)"= 208, 300, 212, 360
}
foreach ($k in $regions.Keys) { $r = $regions[$k]; "{0,-22} darkest {1}" -f $k, (Darkest $r[0] $r[1] $r[2] $r[3]) }

"-- sky column x=400 (y: colour)"
0, 15, 30, 50, 70, 90, 110, 140, 170, 190, 200, 205, 210 | ForEach-Object { $c = $bmp.GetPixel(400, $_); "{0}: #{1:X2}{2:X2}{3:X2}" -f $_, $c.R, $c.G, $c.B }
"-- cloud samples"
(250, 60), (330, 85), (450, 75), (560, 110), (700, 30), (900, 20) | ForEach-Object { $c = $bmp.GetPixel($_[0], $_[1]); "({0},{1}): #{2:X2}{3:X2}{4:X2}" -f $_[0], $_[1], $c.R, $c.G, $c.B }
"-- ledge / hero bottom, x=900, y 185..215"
185..215 | Where-Object { $_ % 3 -eq 0 } | ForEach-Object { $c = $bmp.GetPixel(900, $_); "{0}: #{1:X2}{2:X2}{3:X2}" -f $_, $c.R, $c.G, $c.B }
"-- grass in due card bottom-right / miso bottom"
(620, 430), (640, 420), (900, 430), (760, 445), (730, 460) | ForEach-Object { $c = $bmp.GetPixel($_[0], $_[1]); "({0},{1}): #{2:X2}{3:X2}{4:X2}" -f $_[0], $_[1], $c.R, $c.G, $c.B }
$bmp.Dispose()
