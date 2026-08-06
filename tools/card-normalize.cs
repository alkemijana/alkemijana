using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Linq;

/*  Poravnavanje skenova tarot karata (RWS).
 *
 *  Sidro je CRNA LINIJA OKVIRA otisnuta na svakoj karti - jedino sto je
 *  na svih 78 karata na istom mjestu. Fizicki rub skena NE valja kao sidro
 *  (negdje je odrezan, negdje se vidi bijela pozadina, negdje sjena).
 *
 *  Postupak: profil tamnoce po rubnim pojasevima -> polozaj okvira -> kut
 *  nagiba iz te iste linije -> rotacija natrag -> izrez okvir + jednaka
 *  kremasta margina -> omjer 0.583 -> jedinstvena velicina.
 */
public static class CardFix
{
    const int DARK = 125;          // prag za "crno" (okvir je tiskan crnom)
    const double BAND = 0.30;      // koliko duboko od ruba trazimo okvir

    static byte[] Gray(Bitmap bmp, out int w, out int h)
    {
        w = bmp.Width; h = bmp.Height;
        var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        int stride = data.Stride;
        var raw = new byte[stride * h];
        System.Runtime.InteropServices.Marshal.Copy(data.Scan0, raw, 0, raw.Length);
        bmp.UnlockBits(data);

        var g = new byte[w * h];
        for (int y = 0; y < h; y++)
        {
            int o = y * stride;
            for (int x = 0; x < w; x++)
            {
                int i = o + x * 3;
                g[y * w + x] = (byte)((raw[i] * 29 + raw[i + 1] * 150 + raw[i + 2] * 77) >> 8);
            }
        }
        return g;
    }

    /* Udio tamnih piksela na liniji `p`, uz nagib `t` = tan(kut).
       side: 0=gore 1=dolje 2=lijevo 3=desno.
       Nagib je nuzan jer je skoro svaki sken malo zakrenut: ravna linija
       kroz zakrenuti okvir "prosjece" nekoliko redaka i udio tamnog padne
       s ~0.95 na ~0.5, pa se okvir vise ne moze razlikovati od crteza. */
    static double DarkFrac(byte[] g, int w, int h, int side, int p, double t)
    {
        int n = 0, dark = 0;
        if (side < 2)
        {
            double cx = w / 2.0;
            for (int x = (int)(w * 0.15); x < w * 0.85; x++)
            {
                int y = (int)Math.Round(p + t * (x - cx));
                if (y < 0 || y >= h) continue;
                n++; if (g[y * w + x] < DARK) dark++;
            }
        }
        else
        {
            double cy = h / 2.0;
            for (int y = (int)(h * 0.15); y < h * 0.85; y++)
            {
                int x = (int)Math.Round(p - t * (y - cy));
                if (x < 0 || x >= w) continue;
                n++; if (g[y * w + x] < DARK) dark++;
            }
        }
        return n == 0 ? 0 : (double)dark / n;
    }

    /* Najbolji (najtamniji) polozaj linije na strani, uz zadani nagib. */
    static double BestFrac(byte[] g, int w, int h, int side, double t)
    {
        int n = (side < 2) ? h : w;
        int band = (int)(n * BAND);
        double best = 0;
        for (int k = 0; k < band; k++)
        {
            int p = (side == 0 || side == 2) ? k : n - 1 - k;
            double f = DarkFrac(g, w, h, side, p, t);
            if (f > best) best = f;
        }
        return best;
    }

    /* Kut karte: trazi se onaj pri kojem su SVE CETIRI linije okvira
       najostrije (zbroj udjela tamnog najveci). Gruba pa fina pretraga. */
    static double Angle(byte[] g, int w, int h)
    {
        Func<double, double> score = deg =>
        {
            double t = Math.Tan(deg * Math.PI / 180.0);
            return BestFrac(g, w, h, 0, t) + BestFrac(g, w, h, 1, t)
                 + BestFrac(g, w, h, 2, t) + BestFrac(g, w, h, 3, t);
        };

        double bestDeg = 0, bestVal = -1;
        for (double d = -2.5; d <= 2.5001; d += 0.1)
        {
            double v = score(d);
            if (v > bestVal) { bestVal = v; bestDeg = d; }
        }
        for (double d = bestDeg - 0.1; d <= bestDeg + 0.1001; d += 0.02)
        {
            double v = score(d);
            if (v > bestVal) { bestVal = v; bestDeg = d; }
        }
        return bestDeg;
    }

    /* Polozaj crne linije okvira: PRVA jaka linija gledano izvana.
       Ne uzima se najtamnija jer je unutar crteza cesto jos tamnijih
       vodoravnih linija (npr. crta iznad naziva karte pri dnu). */
    static int EdgePos(byte[] g, int w, int h, int side)
    {
        int n = (side < 2) ? h : w;
        int band = (int)(n * BAND);
        var pos = new int[band];
        var frac = new double[band];
        double best = 0;
        for (int k = 0; k < band; k++)
        {
            pos[k] = (side == 0 || side == 2) ? k : n - 1 - k;
            frac[k] = DarkFrac(g, w, h, side, pos[k], 0);
            if (frac[k] > best) best = frac[k];
        }
        if (best < 0.45) return pos[0];

        double thr = Math.Max(0.70, best * 0.88);
        int start = -1;
        for (int k = 0; k < band; k++) if (frac[k] >= thr) { start = k; break; }
        if (start < 0) return pos[0];

        int end = start;
        while (end + 1 < band && frac[end + 1] >= thr * 0.8) end++;
        return pos[(start + end) / 2];
    }

    static Rectangle Frame(byte[] g, int w, int h)
    {
        int t = EdgePos(g, w, h, 0), b = EdgePos(g, w, h, 1);
        int l = EdgePos(g, w, h, 2), r = EdgePos(g, w, h, 3);
        return Rectangle.FromLTRB(l, t, r + 1, b + 1);
    }

    /* Sve jake linije na jednoj strani, poredane izvana prema unutra.
       Dno karte ima dvije (rub okvira i crta iznad naziva), a i u crtezu
       zna biti dugackih ravnih linija - zato se ne uzima prva nego se
       kasnije bira par koji daje ocekivanu velicinu okvira. */
    static List<int> EdgeCandidates(byte[] g, int w, int h, int side)
    {
        int n = (side < 2) ? h : w;
        int band = (int)(n * BAND);
        var pos = new int[band]; var frac = new double[band];
        double best = 0;
        for (int k = 0; k < band; k++)
        {
            pos[k] = (side == 0 || side == 2) ? k : n - 1 - k;
            frac[k] = DarkFrac(g, w, h, side, pos[k], 0);
            if (frac[k] > best) best = frac[k];
        }
        var res = new List<int>();
        if (best < 0.45) { res.Add(pos[0]); return res; }

        double thr = Math.Max(0.62, best * 0.82);
        int k2 = 0;
        while (k2 < band && res.Count < 5)
        {
            if (frac[k2] < thr) { k2++; continue; }
            int start = k2;
            while (k2 + 1 < band && frac[k2 + 1] >= thr * 0.8) k2++;
            res.Add(pos[(start + k2) / 2]);
            k2 += 3;
        }
        if (res.Count == 0) res.Add(pos[0]);
        return res;
    }

    /* Od kandidata s dvije nasuprotne strane bira par najblizi ocekivanoj
       velicini okvira (medijanu cijelog spila). */
    static void PickPair(List<int> aCand, List<int> bCand, double expect, out int a, out int b)
    {
        a = aCand[0]; b = bCand[0];
        double bestErr = double.MaxValue;
        foreach (int ca in aCand)
            foreach (int cb in bCand)
            {
                double d = cb - ca;
                if (d < expect * 0.6) continue;
                double err = Math.Abs(d - expect);
                if (err < bestErr) { bestErr = err; a = ca; b = cb; }
            }
    }

    /* Prosjecna boja kremastog ruba karte (izmedju okvira i ruba skena). */
    static Color EdgeColor(Bitmap bmp, Rectangle fr)
    {
        long r = 0, g2 = 0, b = 0; int n = 0;
        Action<int, int> take = (x, y) =>
        {
            if (x < 0 || y < 0 || x >= bmp.Width || y >= bmp.Height) return;
            var c = bmp.GetPixel(x, y);
            if (c.R + c.G + c.B < 400) return;
            r += c.R; g2 += c.G; b += c.B; n++;
        };
        for (int x = fr.Left; x < fr.Right; x += 4)
            for (int d = 4; d <= 8; d++) { take(x, fr.Top - d); take(x, fr.Bottom + d); }
        for (int y = fr.Top; y < fr.Bottom; y += 4)
            for (int d = 4; d <= 8; d++) { take(fr.Left - d, y); take(fr.Right + d, y); }
        if (n < 50) return Color.FromArgb(240, 233, 219);
        return Color.FromArgb((int)(r / n), (int)(g2 / n), (int)(b / n));
    }

    /* ---- Obrada cijelog spila u dva prolaza ----
       1) svakoj karti se nadje kut i okvir
       2) uzme se MEDIJAN velicine okvira i svaka se karta izreze na tu
          velicinu oko svog sredista.
       Zasto medijan: fizicke karte su jednake pa je i otisnuti okvir na
       svakoj jednako velik. Sredina okvira se detektira pouzdano, sama
       velicina ne (na ponekoj karti se rub crteza spoji s okvirom). Ovako
       sve 78 karata ispadnu identicno kadrirane. */
    public static string[] ProcessDeck(string srcDir, string dstDir, int outW, double ratio, double marginPct)
    {
        var files = System.IO.Directory.GetFiles(srcDir, "*.jpg").OrderBy(f => f).ToArray();
        int n = files.Length;
        var ang = new double[n];
        var fx = new double[n]; var fy = new double[n];
        var fw = new double[n]; var fh = new double[n];
        var fill = new Color[n];
        var rot = new Bitmap[n];
        var cT = new List<int>[n]; var cB = new List<int>[n];
        var cL = new List<int>[n]; var cR = new List<int>[n];

        for (int i = 0; i < n; i++)
        {
            var orig = new Bitmap(files[i]);
            int w0, h0;
            var g0 = Gray(orig, out w0, out h0);
            ang[i] = Angle(g0, w0, h0);
            fill[i] = EdgeColor(orig, Frame(g0, w0, h0));

            Bitmap work;
            if (Math.Abs(ang[i]) > 0.04)
            {
                work = new Bitmap(w0, h0, PixelFormat.Format24bppRgb);
                using (var gr = Graphics.FromImage(work))
                {
                    gr.Clear(fill[i]);
                    gr.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    gr.SmoothingMode = SmoothingMode.HighQuality;
                    gr.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    gr.TranslateTransform(w0 / 2f, h0 / 2f);
                    gr.RotateTransform((float)(-ang[i]));
                    gr.TranslateTransform(-w0 / 2f, -h0 / 2f);
                    gr.DrawImage(orig, 0, 0, w0, h0);
                }
            }
            else work = new Bitmap(orig);
            orig.Dispose();

            int w, h;
            var g = Gray(work, out w, out h);
            cT[i] = EdgeCandidates(g, w, h, 0); cB[i] = EdgeCandidates(g, w, h, 1);
            cL[i] = EdgeCandidates(g, w, h, 2); cR[i] = EdgeCandidates(g, w, h, 3);
            fw[i] = cR[i][0] - cL[i][0];
            fh[i] = cB[i][0] - cT[i][0];
            rot[i] = work;
        }

        var sw = (double[])fw.Clone(); Array.Sort(sw);
        var sh = (double[])fh.Clone(); Array.Sort(sh);
        double medW = sw[n / 2], medH = sh[n / 2];

        /* Drugi prolaz: odaberi par linija koji odgovara medijanu i tek onda
           sredinu. Ako neki rub uopce nije nadjen (na par karata je crna
           linija izblijedjela ili se stopila s crtezom) velicina odudara -
           tada se za tu os uzima sredina slike, jer su svi skenovi u ovom
           setu kadrirani priblizno po sredini karte. */
        int fb = 0;
        for (int i = 0; i < n; i++)
        {
            int l, r, t, b;
            PickPair(cL[i], cR[i], medW, out l, out r);
            PickPair(cT[i], cB[i], medH, out t, out b);
            fw[i] = r - l; fh[i] = b - t;
            fx[i] = (l + r) / 2.0; fy[i] = (t + b) / 2.0;

            if (Math.Abs(fw[i] - medW) > 25) { fx[i] = rot[i].Width / 2.0; fb++; }
            if (Math.Abs(fh[i] - medH) > 30) { fy[i] = rot[i].Height / 2.0; fb++; }
        }
        sw = (double[])fw.Clone(); Array.Sort(sw);
        sh = (double[])fh.Clone(); Array.Sort(sh);
        medW = sw[n / 2]; medH = sh[n / 2];

        double margin = medW * marginPct;
        double boxW = medW + 2 * margin, boxH = medH + 2 * margin;
        if (boxW / boxH > ratio) boxH = boxW / ratio; else boxW = boxH * ratio;

        int outH = (int)Math.Round(outW / ratio);
        var report = new string[n + 1];
        report[0] = string.Format("medijan okvira {0:0}x{1:0} -> izrez {2:0}x{3:0} (omjer {4:0.000}), rezervna sredina {5}x",
                                  medW, medH, boxW, boxH, boxW / boxH, fb);

        for (int i = 0; i < n; i++)
        {
            var work = rot[i];
            double cl = fx[i] - boxW / 2, cr = fx[i] + boxW / 2;
            double ct = fy[i] - boxH / 2, cb = fy[i] + boxH / 2;

            using (var res = new Bitmap(outW, outH, PixelFormat.Format24bppRgb))
            {
                using (var gr = Graphics.FromImage(res))
                {
                    gr.Clear(fill[i]);
                    gr.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    gr.SmoothingMode = SmoothingMode.HighQuality;
                    gr.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    gr.CompositingQuality = CompositingQuality.HighQuality;

                    double sl = Math.Max(cl, 0), st = Math.Max(ct, 0);
                    double sr = Math.Min(cr, work.Width), sb = Math.Min(cb, work.Height);
                    double kx = outW / (cr - cl), ky = outH / (cb - ct);
                    var destR = new RectangleF(
                        (float)((sl - cl) * kx), (float)((st - ct) * ky),
                        (float)((sr - sl) * kx), (float)((sb - st) * ky));
                    var srcR = new RectangleF((float)sl, (float)st, (float)(sr - sl), (float)(sb - st));
                    gr.DrawImage(work, destR, srcR, GraphicsUnit.Pixel);
                }

                CleanEdge(res, fill[i]);

                var enc = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");
                var pars = new EncoderParameters(1);
                pars.Param[0] = new EncoderParameter(Encoder.Quality, 92L);
                res.Save(System.IO.Path.Combine(dstDir, System.IO.Path.GetFileName(files[i])), enc, pars);
            }
            work.Dispose();

            report[i + 1] = string.Format("{0,-20} kut {1,6:0.00}  okvir {2:0}x{3:0}  sredina {4:0},{5:0}  L{6} T{7} R{8} B{9}",
                System.IO.Path.GetFileName(files[i]), ang[i], fw[i], fh[i], fx[i], fy[i],
                string.Join("/", cL[i]), string.Join("/", cT[i]), string.Join("/", cR[i]), string.Join("/", cB[i]));
        }
        return report;
    }

    /* Zaostali bijeli klin u kutu: gdje god je izrez zagrebao pozadinu
       skena (papir je kremast, pozadina cisto bijela), u vanjskom prstenu
       se takvi pikseli zamijene bojom ruba karte. Radi samo na rubu da ne
       dira ilustraciju. */
    static void CleanEdge(Bitmap bmp, Color fill)
    {
        int w = bmp.Width, h = bmp.Height;
        int mx = (int)(w * 0.075), my = (int)(h * 0.045);
        int tr = Math.Min(250, fill.R + 6), tg = Math.Min(250, fill.G + 6), tb = Math.Min(252, fill.B + 10);

        var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb);
        int stride = data.Stride;
        var raw = new byte[stride * h];
        System.Runtime.InteropServices.Marshal.Copy(data.Scan0, raw, 0, raw.Length);

        for (int y = 0; y < h; y++)
        {
            bool edgeRow = (y < my || y >= h - my);
            for (int x = 0; x < w; x++)
            {
                if (!edgeRow && x >= mx && x < w - mx) continue;
                int i = y * stride + x * 3;
                if (raw[i] > tb && raw[i + 1] > tg && raw[i + 2] > tr)   // BGR
                {
                    raw[i] = fill.B; raw[i + 1] = fill.G; raw[i + 2] = fill.R;
                }
            }
        }
        System.Runtime.InteropServices.Marshal.Copy(raw, 0, data.Scan0, raw.Length);
        bmp.UnlockBits(data);
    }

    public static string Profile(string src, int side, int count)
    {
        using (var bmp = new Bitmap(src))
        {
            int w, h;
            var g = Gray(bmp, out w, out h);
            int n = (side < 2) ? h : w;
            var sb = new System.Text.StringBuilder();
            for (int k = 0; k < count; k++)
            {
                int p = (side == 0 || side == 2) ? k : n - 1 - k;
                sb.Append(((int)(DarkFrac(g, w, h, side, p, 0) * 99)).ToString("00")).Append(' ');
            }
            return sb.ToString();
        }
    }

    public static string Process(string src, string dst, int outW, double ratio, double marginPct, bool deskew)
    {
        using (var orig = new Bitmap(src))
        {
            int w0, h0;
            var g0 = Gray(orig, out w0, out h0);
            var fr0 = Frame(g0, w0, h0);
            Color fill = EdgeColor(orig, fr0);

            double ang = deskew ? Angle(g0, w0, h0) : 0;
            if (Math.Abs(ang) > 4) ang = 0;

            Bitmap work;
            if (Math.Abs(ang) > 0.04)
            {
                work = new Bitmap(w0, h0, PixelFormat.Format24bppRgb);
                using (var gr = Graphics.FromImage(work))
                {
                    gr.Clear(fill);
                    gr.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    gr.SmoothingMode = SmoothingMode.HighQuality;
                    gr.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    gr.TranslateTransform(w0 / 2f, h0 / 2f);
                    gr.RotateTransform((float)(-ang));
                    gr.TranslateTransform(-w0 / 2f, -h0 / 2f);
                    gr.DrawImage(orig, 0, 0, w0, h0);
                }
            }
            else work = new Bitmap(orig);

            using (work)
            {
                int w, h;
                var g = Gray(work, out w, out h);
                var fr = Frame(g, w, h);
                if (fr.Width < w * 0.55 || fr.Height < h * 0.55)
                    return System.IO.Path.GetFileName(src) + " | PRESKOCENO (okvir nije nadjen)";

                double margin = fr.Width * marginPct;
                double cl = fr.Left - margin, cr = fr.Right + margin;
                double ct = fr.Top - margin, cb = fr.Bottom + margin;

                double cw = cr - cl, ch = cb - ct;
                if (cw / ch > ratio) { double nh = cw / ratio; double cy = (ct + cb) / 2; ct = cy - nh / 2; cb = cy + nh / 2; }
                else { double nw = ch * ratio; double cx = (cl + cr) / 2; cl = cx - nw / 2; cr = cx + nw / 2; }

                int outH = (int)Math.Round(outW / ratio);
                using (var res = new Bitmap(outW, outH, PixelFormat.Format24bppRgb))
                {
                    using (var gr = Graphics.FromImage(res))
                    {
                        gr.Clear(fill);
                        gr.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        gr.SmoothingMode = SmoothingMode.HighQuality;
                        gr.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        gr.CompositingQuality = CompositingQuality.HighQuality;

                        double sl = Math.Max(cl, 0), st = Math.Max(ct, 0);
                        double sr = Math.Min(cr, w), sb = Math.Min(cb, h);
                        double sx = outW / (cr - cl), sy = outH / (cb - ct);
                        var destR = new RectangleF(
                            (float)((sl - cl) * sx), (float)((st - ct) * sy),
                            (float)((sr - sl) * sx), (float)((sb - st) * sy));
                        var srcR = new RectangleF((float)sl, (float)st, (float)(sr - sl), (float)(sb - st));
                        gr.DrawImage(work, destR, srcR, GraphicsUnit.Pixel);
                    }

                    var enc = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");
                    var pars = new EncoderParameters(1);
                    pars.Param[0] = new EncoderParameter(Encoder.Quality, 92L);
                    res.Save(dst, enc, pars);
                }

                return string.Format("{0} | kut {1,6:0.00} | okvir {2}x{3} @ {4},{5} | omjer {6:0.000}",
                    System.IO.Path.GetFileName(src), ang, fr.Width, fr.Height, fr.Left, fr.Top,
                    (double)fr.Width / fr.Height);
            }
        }
    }
}
