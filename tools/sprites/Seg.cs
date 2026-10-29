using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Linq;

public static class Seg
{
    public static int[] Load(string path, out int w, out int h)
    {
        using (var bmp = new Bitmap(path))
        {
            w = bmp.Width; h = bmp.Height;
            var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var px = new int[w * h];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, px, 0, px.Length);
            bmp.UnlockBits(data);
            return px;
        }
    }

    // Loads an image scaled to a new width with area-averaging (use before cutting out the background).
    public static int[] LoadResized(string path, int newWidth, out int w, out int h)
    {
        using (var src = new Bitmap(path))
        {
            w = newWidth;
            h = (int)Math.Round((double)src.Height * newWidth / src.Width);
            using (var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb))
            {
                using (var g = Graphics.FromImage(dst))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                    g.DrawImage(src, new Rectangle(0, 0, w, h));
                }
                var data = dst.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                var px = new int[w * h];
                System.Runtime.InteropServices.Marshal.Copy(data.Scan0, px, 0, px.Length);
                dst.UnlockBits(data);
                return px;
            }
        }
    }

    static int R(int p) { return (p >> 16) & 255; }
    static int G(int p) { return (p >> 8) & 255; }
    static int B(int p) { return p & 255; }

    public static int Dist(int a, int b)
    {
        return Math.Max(Math.Abs(R(a) - R(b)), Math.Max(Math.Abs(G(a) - G(b)), Math.Abs(B(a) - B(b))));
    }

    public static int BgColor(int[] px, int w)
    {
        long r = 0, g = 0, b = 0; int n = 0;
        for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) { var p = px[y * w + x]; r += R(p); g += G(p); b += B(p); n++; }
        return (255 << 24) | ((int)(r / n) << 16) | ((int)(g / n) << 8) | (int)(b / n);
    }

    // Returns bounding boxes (x0,y0,x1,y1) of dilated non-background components.
    public static List<int[]> Boxes(int[] px, int w, int h, int bg, int tol, int dilate, int minArea)
    {
        var mask = new bool[w * h];
        for (int i = 0; i < mask.Length; i++) mask[i] = Dist(px[i], bg) > tol;
        var dil = new bool[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                if (mask[y * w + x])
                    for (int dy = -dilate; dy <= dilate; dy++)
                        for (int dx = -dilate; dx <= dilate; dx++)
                        {
                            int nx = x + dx, ny = y + dy;
                            if (nx >= 0 && ny >= 0 && nx < w && ny < h) dil[ny * w + nx] = true;
                        }
        var seen = new bool[w * h];
        var result = new List<int[]>();
        var q = new Queue<int>();
        for (int s = 0; s < dil.Length; s++)
        {
            if (!dil[s] || seen[s]) continue;
            int x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
            seen[s] = true; q.Enqueue(s);
            while (q.Count > 0)
            {
                int c = q.Dequeue(); int cx = c % w, cy = c / w;
                if (mask[c]) { area++; if (cx < x0) x0 = cx; if (cy < y0) y0 = cy; if (cx > x1) x1 = cx; if (cy > y1) y1 = cy; }
                for (int k = 0; k < 4; k++)
                {
                    int nx = cx + (k == 0 ? 1 : k == 1 ? -1 : 0), ny = cy + (k == 2 ? 1 : k == 3 ? -1 : 0);
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    int ni = ny * w + nx;
                    if (dil[ni] && !seen[ni]) { seen[ni] = true; q.Enqueue(ni); }
                }
            }
            if (area >= minArea) result.Add(new[] { x0, y0, x1, y1, area });
        }
        return result;
    }

    // Splits a horizontal band of the sheet into sprites wherever there is a gap of empty columns.
    public static List<int[]> Columns(int[] px, int w, int bg, int tol, int y0, int y1, int minGap, int minPixels)
    {
        var colHas = new int[w];
        for (int x = 0; x < w; x++)
            for (int y = y0; y <= y1; y++)
                if (Dist(px[y * w + x], bg) > tol) colHas[x]++;
        var result = new List<int[]>();
        int start = -1, gap = 0, total = 0;
        for (int x = 0; x < w; x++)
        {
            if (colHas[x] > 0) { if (start < 0) { start = x; total = 0; } gap = 0; total += colHas[x]; }
            else if (start >= 0)
            {
                gap++;
                if (gap >= minGap) { if (total >= minPixels) result.Add(new[] { start, y0, x - gap, y1, total }); start = -1; gap = 0; }
            }
        }
        if (start >= 0 && total >= minPixels) result.Add(new[] { start, y0, w - 1, y1, total });
        return result;
    }

    // Crops a region, makes the connected background transparent, trims, and saves as PNG.
    public static void Cut(int[] px, int w, int bg, int tol, int x0, int y0, int x1, int y1, string outPath)
    {
        Cut(px, w, bg, tol, x0, y0, x1, y1, outPath, 0);
    }

    // seal > 0 treats dark outline pixels as walls thickened by `seal` pixels, so small gaps in the
    // outline cannot let the background flood leak into light fur inside the sprite.
    public static void Cut(int[] px, int w, int bg, int tol, int x0, int y0, int x1, int y1, string outPath, int seal)
    {
        int cw = x1 - x0 + 1, ch = y1 - y0 + 1;
        var a = new byte[cw * ch];
        var isBg = new bool[cw * ch];
        var barrier = new bool[cw * ch];
        if (seal > 0)
        {
            for (int y = 0; y < ch; y++)
                for (int x = 0; x < cw; x++)
                {
                    int p = px[(y0 + y) * w + x0 + x];
                    if (R(p) + G(p) + B(p) < 3 * 150)
                        for (int dy = -seal; dy <= seal; dy++)
                            for (int dx = -seal; dx <= seal; dx++)
                            {
                                int nx = x + dx, ny = y + dy;
                                if (nx >= 0 && ny >= 0 && nx < cw && ny < ch) barrier[ny * cw + nx] = true;
                            }
                }
        }
        var q = new Queue<int>();
        for (int y = 0; y < ch; y++)
            for (int x = 0; x < cw; x++)
            {
                bool edge = x == 0 || y == 0 || x == cw - 1 || y == ch - 1;
                if (edge && Dist(px[(y0 + y) * w + x0 + x], bg) <= tol) { isBg[y * cw + x] = true; q.Enqueue(y * cw + x); }
            }
        while (q.Count > 0)
        {
            int c = q.Dequeue(); int cx = c % cw, cy = c / cw;
            for (int k = 0; k < 4; k++)
            {
                int nx = cx + (k == 0 ? 1 : k == 1 ? -1 : 0), ny = cy + (k == 2 ? 1 : k == 3 ? -1 : 0);
                if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
                int ni = ny * cw + nx;
                if (!isBg[ni] && !barrier[ni] && Dist(px[(y0 + ny) * w + x0 + nx], bg) <= tol) { isBg[ni] = true; q.Enqueue(ni); }
            }
        }
        // Re-open the walled strip next to the true outside so no cream halo is left around the outline.
        for (int pass = 0; pass < seal; pass++)
        {
            var add = new List<int>();
            for (int y = 0; y < ch; y++)
                for (int x = 0; x < cw; x++)
                {
                    int i = y * cw + x;
                    if (isBg[i] || !barrier[i] || Dist(px[(y0 + y) * w + x0 + x], bg) > tol) continue;
                    for (int k = 0; k < 4; k++)
                    {
                        int nx = x + (k == 0 ? 1 : k == 1 ? -1 : 0), ny = y + (k == 2 ? 1 : k == 3 ? -1 : 0);
                        if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && isBg[ny * cw + nx]) { add.Add(i); break; }
                    }
                }
            foreach (var i in add) isBg[i] = true;
        }
        // Peel one pixel of faint JPEG halo around the removed background.
        var peel = new bool[cw * ch];
        for (int y = 0; y < ch; y++)
            for (int x = 0; x < cw; x++)
            {
                if (isBg[y * cw + x]) continue;
                bool near = false;
                for (int k = 0; k < 4 && !near; k++)
                {
                    int nx = x + (k == 0 ? 1 : k == 1 ? -1 : 0), ny = y + (k == 2 ? 1 : k == 3 ? -1 : 0);
                    if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && isBg[ny * cw + nx]) near = true;
                }
                if (near && Dist(px[(y0 + y) * w + x0 + x], bg) <= tol * 3) peel[y * cw + x] = true;
            }
        int minX = cw, minY = ch, maxX = 0, maxY = 0;
        for (int y = 0; y < ch; y++)
            for (int x = 0; x < cw; x++)
            {
                bool keep = !isBg[y * cw + x] && !peel[y * cw + x];
                a[y * cw + x] = keep ? (byte)255 : (byte)0;
                if (keep) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
            }
        int tw = maxX - minX + 1, th = maxY - minY + 1;
        using (var bmp = new Bitmap(tw, th, PixelFormat.Format32bppArgb))
        {
            for (int y = 0; y < th; y++)
                for (int x = 0; x < tw; x++)
                {
                    int sx = minX + x, sy = minY + y;
                    int p = px[(y0 + sy) * w + x0 + sx];
                    int alpha = a[sy * cw + sx];
                    bmp.SetPixel(x, y, Color.FromArgb(alpha, R(p), G(p), B(p)));
                }
            bmp.Save(outPath, ImageFormat.Png);
        }
    }

    // Finds the pixel-art block size by comparing edge strength on and off a regular grid.
    // Returns {blockSize, offsetX, offsetY, ratioX, ratioY (x1000)}.
    public static int[] DetectGrid(int[] px, int w, int h, int minB, int maxB)
    {
        int bestB = 1, bestOx = 0, bestOy = 0; double bestScore = 0;
        for (int b = minB; b <= maxB; b++)
        {
            double sx = 0; int ox = 0;
            for (int o = 0; o < b; o++)
            {
                double on = 0, off = 0; long onN = 0, offN = 0;
                for (int x = 1; x < w; x++)
                {
                    long d = 0;
                    for (int y = 0; y < h; y += 4) d += Dist(px[y * w + x], px[y * w + x - 1]);
                    if (x % b == o) { on += d; onN++; } else { off += d; offN++; }
                }
                double r = (on / Math.Max(1, onN)) / Math.Max(1.0, off / Math.Max(1, offN));
                if (r > sx) { sx = r; ox = o; }
            }
            double sy = 0; int oy = 0;
            for (int o = 0; o < b; o++)
            {
                double on = 0, off = 0; long onN = 0, offN = 0;
                for (int y = 1; y < h; y++)
                {
                    long d = 0;
                    for (int x = 0; x < w; x += 4) d += Dist(px[y * w + x], px[(y - 1) * w + x]);
                    if (y % b == o) { on += d; onN++; } else { off += d; offN++; }
                }
                double r = (on / Math.Max(1, onN)) / Math.Max(1.0, off / Math.Max(1, offN));
                if (r > sy) { sy = r; oy = o; }
            }
            Console.WriteLine("B=" + b + " ox=" + ox + " rx=" + sx.ToString("F2") + " oy=" + oy + " ry=" + sy.ToString("F2"));
            double score = Math.Min(sx, sy);
            if (score > bestScore) { bestScore = score; bestB = b; bestOx = ox; bestOy = oy; }
        }
        return new[] { bestB, bestOx, bestOy, (int)(bestScore * 1000) };
    }

    public static void Debug(string src, List<int[]> boxes, string outPath)
    {
        using (var bmp = new Bitmap(src))
        using (var g = Graphics.FromImage(bmp))
        using (var pen = new Pen(Color.Red, 1))
        using (var font = new Font("Arial", 9))
        {
            for (int i = 0; i < boxes.Count; i++)
            {
                var b = boxes[i];
                g.DrawRectangle(pen, b[0], b[1], b[2] - b[0], b[3] - b[1]);
                g.DrawString(i.ToString(), font, Brushes.Blue, b[0], b[1]);
            }
            bmp.Save(outPath, ImageFormat.Png);
        }
    }
}
