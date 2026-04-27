const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const url = "exp://falcon-regulate-simmering.ngrok-free.dev";

// Install qrcode if needed then generate
try {
  execSync("npm install qrcode --no-save --prefix .", { cwd: "D:\\TASGO final", stdio: "inherit" });
} catch (e) {}

const QRCode = require("D:\\TASGO final\\node_modules\\qrcode");

QRCode.toDataURL(url, { width: 400, margin: 2 }, (err, dataUrl) => {
  if (err) {
    console.error("QR error:", err);
    process.exit(1);
  }
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>TasGo QR</title>
<style>
body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fafafa}
h2{color:#1a1a1a;margin-bottom:8px}
p{color:#888;font-size:13px;margin:4px 0 24px}
img{border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.15)}
code{font-size:11px;color:#999;margin-top:16px;display:block;text-align:center}
</style>
</head>
<body>
<h2>TasGo Mobile — Expo Go</h2>
<p>Scan with <strong>iPhone Camera app</strong> — it opens Expo Go automatically</p>
<img src="${dataUrl}" width="300" height="300" />
<code>${url}</code>
</body>
</html>`;
  fs.writeFileSync("D:\\TASGO final\\qr2.html", html);
  console.log("QR code written to qr2.html");
});
