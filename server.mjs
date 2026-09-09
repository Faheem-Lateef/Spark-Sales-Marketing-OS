
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = process.env.SPARK_DATA_DIR || path.join(__dirname, "data");
const MAX_BODY = 64 * 1024;
const rate = new Map();

const mime = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"application/javascript; charset=utf-8",
  ".png":"image/png",
  ".svg":"image/svg+xml",
  ".mp4":"video/mp4",
  ".json":"application/json; charset=utf-8",
  ".txt":"text/plain; charset=utf-8"
};

function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options","SAMEORIGIN");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy","default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'");
}

function json(res, status, body) {
  securityHeaders(res);
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8"});
  res.end(JSON.stringify(body));
}

function clean(value, max=1000) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

function validateLead(body) {
  const name = clean(body.name, 120);
  const company = clean(body.company, 160);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  if (name.length < 2) return "Name is required.";
  if (company.length < 2) return "Company is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "A valid email is required.";
  if (phone && !/^[+0-9() .-]{7,20}$/.test(phone)) return "Phone format is invalid.";
  return null;
}

function allowedPath(requestPath) {
  const raw = decodeURIComponent(requestPath.split("?")[0]);
  const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
  const resolved = path.resolve(__dirname, rel);
  if (!resolved.startsWith(path.resolve(__dirname) + path.sep)) return null;
  return resolved;
}

const legacyRedirects = new Map([
  ["/ai-agents.html", "/ai-agent.html"],
  ["/human-bot.html", "/ai-agent.html"],
  ["/growth-pod.html", "/human-agents.html"],
  ["/revenue-os.html", "/index.html"],
  ["/ai-sales-os.html", "/index.html"],
  ["/ai-growth-os.html", "/index.html"]
]);

const server = http.createServer((req, res) => {
  securityHeaders(res);

  if (["GET","HEAD"].includes(req.method) && legacyRedirects.has(req.url)) {
    res.writeHead(302, {"Location": legacyRedirects.get(req.url), "Cache-Control":"no-cache"});
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/consultation") {
    const ip = req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const bucket = (rate.get(ip) || []).filter(t => now - t < 60_000);
    if (bucket.length >= 10) return json(res, 429, {error:"Too many requests. Please try again shortly."});
    bucket.push(now); rate.set(ip, bucket);

    let size = 0, chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY) req.destroy();
      else chunks.push(chunk);
    });
    req.on("end", () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { return json(res, 400, {error:"Invalid request body."}); }

      const error = validateLead(body);
      if (error) return json(res, 422, {error});

      const record = {
        created_at: new Date().toISOString(),
        name: clean(body.name,120),
        company: clean(body.company,160),
        email: clean(body.email,200).toLowerCase(),
        phone: clean(body.phone,40),
        volume: clean(body.volume,60),
        sources: clean(body.sources,200),
        bottleneck: clean(body.bottleneck,1000),
        source_page: clean(body.source_page,200)
      };

      try {
        fs.mkdirSync(DATA_DIR, {recursive:true});
        fs.appendFileSync(path.join(DATA_DIR,"consultation-leads.ndjson"), JSON.stringify(record) + "\n", {encoding:"utf8", mode:0o600});
        return json(res, 201, {ok:true});
      } catch {
        return json(res, 500, {error:"Could not save the request."});
      }
    });
    req.on("error", () => { if (!res.headersSent) json(res, 400, {error:"Request failed."}); });
    return;
  }

  if (!["GET","HEAD"].includes(req.method)) {
    res.writeHead(405, {"Allow":"GET, HEAD, POST"});
    return res.end("Method not allowed");
  }

  const filePath = allowedPath(req.url || "/");
  if (!filePath) {
    res.writeHead(400, {"Content-Type":"text/plain; charset=utf-8"});
    return res.end("Bad request");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"});
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Spark AI Sales & Marketing OS running at http://127.0.0.1:${PORT}`);
});
