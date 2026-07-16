import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, tool, robotsPath = "/" } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Format URL
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "http://" + targetUrl;
    }

    if (tool === "redirect") {
      const hops: { url: string; status: number; redirectUrl: string | null }[] = [];
      let currentUrl = targetUrl;
      let loopCount = 0;
      const maxRedirects = 10;

      while (loopCount < maxRedirects) {
        try {
          const res = await fetch(currentUrl, {
            method: "HEAD",
            redirect: "manual",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEO-Tracer/1.0",
            },
          });

          const status = res.status;
          const location = res.headers.get("location");

          if (status >= 300 && status < 400 && location) {
            const resolvedLocation = new URL(location, currentUrl).toString();
            hops.push({
              url: currentUrl,
              status,
              redirectUrl: resolvedLocation,
            });
            currentUrl = resolvedLocation;
            loopCount++;
          } else {
            hops.push({
              url: currentUrl,
              status,
              redirectUrl: null,
            });
            break;
          }
        } catch (err: any) {
          hops.push({
            url: currentUrl,
            status: 0,
            redirectUrl: null,
          });
          break;
        }
      }

      return NextResponse.json({ hops });
    }

    if (tool === "robots") {
      try {
        const parsedUrl = new URL(targetUrl);
        const origin = parsedUrl.origin;
        const robotsUrl = `${origin}/robots.txt`;

        const robotsRes = await fetch(robotsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEO-Tracer/1.0",
          },
        });

        if (!robotsRes.ok) {
          return NextResponse.json({
            content: "Robots.txt not found (returned " + robotsRes.status + ")",
            rules: [],
            isAllowed: true,
            warning: "No robots.txt file detected. Search engines assume complete access by default."
          });
        }

        const text = await robotsRes.text();
        const lines = text.split(/\r?\n/);
        const rules: { type: "allow" | "disallow" | "sitemap"; value: string; agent: string }[] = [];
        let currentAgent = "*";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine.startsWith("#")) continue;

          const agentMatch = cleanLine.match(/^user-agent:\s*(.+)$/i);
          if (agentMatch) {
            currentAgent = agentMatch[1].trim();
            continue;
          }

          const disallowMatch = cleanLine.match(/^disallow:\s*(.*)$/i);
          if (disallowMatch) {
            rules.push({
              type: "disallow",
              value: disallowMatch[1].trim(),
              agent: currentAgent
            });
            continue;
          }

          const allowMatch = cleanLine.match(/^allow:\s*(.*)$/i);
          if (allowMatch) {
            rules.push({
              type: "allow",
              value: allowMatch[1].trim(),
              agent: currentAgent
            });
            continue;
          }

          const sitemapMatch = cleanLine.match(/^sitemap:\s*(.+)$/i);
          if (sitemapMatch) {
            rules.push({
              type: "sitemap",
              value: sitemapMatch[1].trim(),
              agent: "*"
            });
          }
        }

        // Test path against '*' agent rules
        let isAllowed = true;
        const testPath = robotsPath.startsWith("/") ? robotsPath : "/" + robotsPath;

        // Sort rules by specificity (longest disallow/allow rule takes precedence)
        const relevantRules = rules
          .filter(r => r.agent === "*" || r.agent.toLowerCase() === "googlebot")
          .sort((a, b) => b.value.length - a.value.length);

        for (const rule of relevantRules) {
          if (rule.type === "sitemap") continue;
          
          // Simple wild card regex match
          const ruleRegexStr = rule.value
            .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape special regex chars
            .replace(/\*/g, ".*")
            .replace(/\?/g, "\\?");
            
          const regex = new RegExp("^" + ruleRegexStr);
          if (regex.test(testPath)) {
            isAllowed = rule.type === "allow";
            break; // Stop at the most specific matching rule
          }
        }

        return NextResponse.json({
          content: text,
          rules,
          isAllowed
        });
      } catch (err: any) {
        return NextResponse.json({
          content: "Failed to fetch robots.txt: " + err.message,
          rules: [],
          isAllowed: true,
          warning: "Fetch failed. Is the host domain blocking bot requests?"
        });
      }
    }

    // For tools that parse HTML: headings, images, canonical
    const htmlRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEO-Tracer/1.0",
      },
    });

    if (!htmlRes.ok) {
      return NextResponse.json({ error: `Failed to fetch HTML (status code: ${htmlRes.status})` }, { status: 400 });
    }

    const htmlText = await htmlRes.text();
    const $ = cheerio.load(htmlText);

    if (tool === "headings") {
      const headings: { level: number; text: string }[] = [];
      const warnings: string[] = [];

      $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        const tagName = el.tagName.toLowerCase();
        const level = parseInt(tagName.substring(1));
        const text = $(el).text().trim().replace(/\s+/g, " ");
        headings.push({ level, text });
      });

      // Analyze hierarchy rules
      const h1Count = headings.filter(h => h.level === 1).length;
      if (h1Count === 0) {
        warnings.push("Missing Heading level 1 (H1). Every webpage should have exactly one <h1> element designating its main topic.");
      } else if (h1Count > 1) {
        warnings.push(`Multiple H1 headings detected (${h1Count}). It is best practice for accessibility and SEO to maintain a single <h1> per page.`);
      }

      let lastLevel = 0;
      for (let i = 0; i < headings.length; i++) {
        const current = headings[i];
        if (lastLevel > 0 && current.level - lastLevel > 1) {
          warnings.push(`Heading Hierarchy Skip: From H${lastLevel} directly to H${current.level} (At: "${current.text.substring(0, 40)}...")`);
        }
        lastLevel = current.level;
      }

      return NextResponse.json({ headings, warnings });
    }

    if (tool === "images") {
      const images: { src: string; alt: string | null; sizeKb: number; hasAlt: boolean; isTooLarge: boolean }[] = [];
      
      const imgElements: { src: string; alt: string | null }[] = [];
      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (src) {
          const resolvedSrc = new URL(src, targetUrl).toString();
          const alt = $(el).attr("alt") ?? null;
          imgElements.push({ src: resolvedSrc, alt });
        }
      });

      // Query size of first 15 images in parallel to prevent bottlenecks
      const sizePromises = imgElements.slice(0, 15).map(async (img) => {
        try {
          const headRes = await fetch(img.src, { method: "HEAD", timeout: 2000 } as any);
          const length = headRes.headers.get("content-length");
          const sizeKb = length ? Math.round(parseInt(length) / 1024) : 0;
          return {
            src: img.src,
            alt: img.alt,
            sizeKb,
            hasAlt: typeof img.alt === "string" && img.alt.trim().length > 0,
            isTooLarge: sizeKb > 200
          };
        } catch {
          return {
            src: img.src,
            alt: img.alt,
            sizeKb: 0,
            hasAlt: typeof img.alt === "string" && img.alt.trim().length > 0,
            isTooLarge: false
          };
        }
      });

      const processedImages = await Promise.all(sizePromises);
      images.push(...processedImages);

      // Add remaining images without loading sizes
      if (imgElements.length > 15) {
        for (let i = 15; i < imgElements.length; i++) {
          const img = imgElements[i];
          images.push({
            src: img.src,
            alt: img.alt,
            sizeKb: 0, // unknown
            hasAlt: typeof img.alt === "string" && img.alt.trim().length > 0,
            isTooLarge: false
          });
        }
      }

      return NextResponse.json({ images });
    }

    if (tool === "canonical") {
      const canonicalLinks: string[] = [];
      $('link[rel="canonical"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          canonicalLinks.push(new URL(href, targetUrl).toString());
        }
      });

      const title = $("title").first().text().trim() || $('meta[property="og:title"]').attr("content")?.trim() || "";
      const description = $('meta[name="description"]').attr("content")?.trim() || $('meta[property="og:description"]').attr("content")?.trim() || "";
      const robots = $('meta[name="robots"]').attr("content")?.trim() || "";

      const warnings: string[] = [];

      if (canonicalLinks.length === 0) {
        warnings.push("No canonical link specified. Search engines may index duplicate URL parameters separately.");
      } else if (canonicalLinks.length > 1) {
        warnings.push(`Multiple canonical link tags found (${canonicalLinks.length}). This confuses search engine indexing bots.`);
      } else {
        const canon = canonicalLinks[0];
        try {
          const parsedUrl = new URL(targetUrl);
          const parsedCanon = new URL(canon);
          if (parsedUrl.pathname !== parsedCanon.pathname || parsedUrl.hostname !== parsedCanon.hostname) {
            warnings.push(`Canonical Mismatch: The canonical URL (${canon}) directs to a different path/domain than the requested page (${targetUrl}).`);
          }
        } catch {
          warnings.push(`Invalid canonical link format: "${canon}"`);
        }
      }

      // Title & Description warnings
      if (!title) {
        warnings.push("Meta title is missing. Search engine result snippet will fall back to default header templates.");
      } else if (title.length < 30 || title.length > 65) {
        warnings.push(`Sub-optimal title tag length (${title.length} characters). Keep title tags between 30 and 65 characters for clean search display.`);
      }

      if (!description) {
        warnings.push("Meta description is missing. Google will select random page paragraphs for organic snippets.");
      } else if (description.length < 110 || description.length > 165) {
        warnings.push(`Sub-optimal meta description length (${description.length} characters). Target 110-165 characters to prevent snippet truncations.`);
      }

      return NextResponse.json({
        metadata: {
          title,
          description,
          canonical: canonicalLinks[0] || null,
          robots
        },
        warnings
      });
    }

    return NextResponse.json({ error: "Invalid tool specified" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
