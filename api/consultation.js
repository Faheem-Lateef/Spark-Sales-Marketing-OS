// Until durable lead delivery is configured, trigger the form's WhatsApp fallback.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(503).json({ error: "Please continue on WhatsApp to submit your consultation request." });
}
