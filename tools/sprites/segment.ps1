# Lists bounding boxes of every sprite on the sheet and writes a debug overlay.
# Usage: powershell -File tools/sprites/segment.ps1
$root = Resolve-Path "$PSScriptRoot\..\.."
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Path "$PSScriptRoot\Seg.cs"

$src = Join-Path $root "design\miso-sprite-sheet.jpg"
$w = 0; $h = 0
$px = [Seg]::Load($src, [ref]$w, [ref]$h)
$bg = [Seg]::BgColor($px, $w)

# Sprite rows above each label line.
$bands = @(@(40, 188), @(222, 298), @(332, 414))
$list = New-Object 'System.Collections.Generic.List[int[]]'
foreach ($band in $bands) {
  foreach ($b in [Seg]::Columns($px, $w, $bg, 26, $band[0], $band[1], 4, 150)) { $list.Add([int[]]$b) }
}
$i = 0
foreach ($b in $list) { "{0}: x {1}-{2}  y {3}-{4}  px {5}" -f $i, $b[0], $b[2], $b[1], $b[3], $b[4]; $i++ }
[Seg]::Debug($src, $list, (Join-Path $root "design\sprite-debug.png"))
