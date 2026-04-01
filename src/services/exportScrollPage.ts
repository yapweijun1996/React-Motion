/**
 * exportScrollPage — Export VideoScript as a standalone auto-scrolling HTML page.
 *
 * Generates a self-contained HTML file that:
 * 1. Renders each scene as a full-viewport section (stacked vertically)
 * 2. Auto-scrolls at the original FPS-based timing
 * 3. User watches passively — manual scroll is blocked
 * 4. Includes progress bar + scene dot indicator
 * 5. Zero external dependencies — all inline CSS/JS
 */

import type { VideoScript } from "../types";

/**
 * Build a standalone HTML string from a VideoScript.
 * Each scene becomes a colored section with its element data rendered as simple HTML.
 */
export function buildScrollPageHtml(script: VideoScript): string {
  const { scenes, fps, durationInFrames, title } = script;
  const primaryColor = script.theme?.primaryColor ?? "#2563eb";

  const sceneSections = scenes.map((scene, i) => {
    const bg = scene.bgGradient
      ? `background:${scene.bgGradient}`
      : `background-color:${scene.bgColor ?? "#ffffff"}`;

    // Render elements as simple HTML (no spring animation — static snapshot)
    const elementsHtml = scene.elements.map((el) => {
      switch (el.type) {
        case "text":
          return `<div class="el-text" style="font-size:${el.fontSize === "title" ? 48 : el.fontSize === "subtitle" ? 32 : 20}px;font-weight:${el.fontSize === "title" ? 700 : 400}">${escapeHtml(String(el.value ?? ""))}</div>`;
        case "metric":
          return `<div class="el-metric"><div class="el-metric-value">${escapeHtml(String(el.value ?? ""))}</div><div class="el-metric-label">${escapeHtml(String(el.label ?? ""))}</div></div>`;
        case "list":
          return `<ul class="el-list">${(Array.isArray(el.items) ? el.items : []).map((item: unknown) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
        case "callout":
          return `<div class="el-callout">${escapeHtml(String(el.value ?? el.text ?? ""))}</div>`;
        case "divider":
          return `<hr class="el-divider"/>`;
        default:
          // Charts and complex elements: show type + label as placeholder
          return `<div class="el-placeholder">[${el.type}${el.title ? `: ${escapeHtml(String(el.title))}` : ""}]</div>`;
      }
    }).join("\n");

    return `
    <section class="scene" data-index="${i}" style="${bg}">
      <div class="scene-content">
        ${elementsHtml}
      </div>
      ${scene.narration ? `<div class="narration">${escapeHtml(scene.narration)}</div>` : ""}
    </section>`;
  }).join("\n");

  // Total duration in ms
  const totalMs = (durationInFrames / fps) * 1000;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow:hidden;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
#viewport{width:100%;height:100vh;overflow:hidden;position:relative}
#scroller{width:100%;transition:transform 0.08s linear}
.scene{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;position:relative}
.scene-content{max-width:800px;padding:40px;display:flex;flex-direction:column;gap:24px}
.el-text{line-height:1.4;color:inherit}
.el-metric{text-align:center}
.el-metric-value{font-size:64px;font-weight:700}
.el-metric-label{font-size:18px;opacity:0.7;margin-top:8px}
.el-list{padding-left:24px;font-size:18px;line-height:2}
.el-callout{padding:20px 24px;border-left:4px solid ${primaryColor};background:rgba(0,0,0,0.05);border-radius:8px;font-size:18px}
.el-divider{border:none;border-top:1px solid rgba(128,128,128,0.3);margin:8px 0}
.el-placeholder{padding:40px;text-align:center;opacity:0.4;font-size:16px;border:1px dashed rgba(128,128,128,0.3);border-radius:8px}
.narration{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);max-width:600px;text-align:center;font-size:14px;opacity:0.5;line-height:1.5}

/* Auto-detect text color based on background */
.scene{color:#1e293b}
.scene.dark{color:#e2e8f0}
.scene.dark .el-callout{background:rgba(255,255,255,0.08)}

/* Progress bar */
#progress{position:fixed;bottom:0;left:0;width:100%;height:3px;background:rgba(128,128,128,0.2);z-index:50}
#progress-fill{height:100%;width:0%;background:${primaryColor};transition:width 0.08s linear}

/* Scene dots */
#dots{position:fixed;right:16px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px;z-index:50}
.dot{width:6px;height:6px;border-radius:50%;background:rgba(128,128,128,0.4);transition:all 0.3s}
.dot.active{width:10px;height:10px;background:${primaryColor}}

/* Play button */
#play-btn{position:fixed;bottom:16px;left:16px;z-index:50;background:rgba(0,0,0,0.5);border:none;border-radius:6px;color:#fff;font-size:13px;padding:6px 14px;cursor:pointer;font-family:inherit;opacity:0.8;transition:opacity 0.2s}
#play-btn:hover{opacity:1}
</style>
</head>
<body>

<div id="viewport">
  <div id="scroller">
    ${sceneSections}
  </div>
</div>

<div id="progress"><div id="progress-fill"></div></div>
<div id="dots">${scenes.map((_, i) => `<div class="dot" data-i="${i}"></div>`).join("")}</div>
<button id="play-btn">Pause</button>

<script>
(function(){
  var sceneCount = ${scenes.length};
  var totalMs = ${totalMs};
  var scroller = document.getElementById('scroller');
  var fill = document.getElementById('progress-fill');
  var dots = document.querySelectorAll('.dot');
  var btn = document.getElementById('play-btn');
  var scenes = document.querySelectorAll('.scene');

  // Dark mode detection per scene
  scenes.forEach(function(s){
    var bg = getComputedStyle(s).backgroundColor;
    var m = bg.match(/\\d+/g);
    if(m){
      var lum = 0.2126*(m[0]/255)+0.7152*(m[1]/255)+0.0722*(m[2]/255);
      if(lum<0.4) s.classList.add('dark');
    }
  });

  var startTime = performance.now();
  var playing = true;
  var pausedAt = 0;
  var raf;

  function tick(now){
    if(!playing) return;
    var elapsed = now - startTime;
    var progress = Math.min(elapsed / totalMs, 1);

    // Auto-scroll
    var translateY = progress * (sceneCount - 1) * window.innerHeight;
    scroller.style.transform = 'translateY(-' + translateY + 'px)';

    // Progress bar
    fill.style.width = (progress * 100) + '%';

    // Scene dots
    var idx = Math.min(Math.floor(progress * sceneCount), sceneCount - 1);
    dots.forEach(function(d,i){
      d.classList.toggle('active', i === idx);
    });

    if(progress >= 1){
      playing = false;
      btn.textContent = 'Replay';
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  btn.addEventListener('click', function(){
    if(!playing && pausedAt >= totalMs){
      // Replay
      startTime = performance.now();
      pausedAt = 0;
      playing = true;
      btn.textContent = 'Pause';
      raf = requestAnimationFrame(tick);
    } else if(playing){
      playing = false;
      pausedAt = performance.now() - startTime;
      btn.textContent = 'Play';
      cancelAnimationFrame(raf);
    } else {
      startTime = performance.now() - pausedAt;
      playing = true;
      btn.textContent = 'Pause';
      raf = requestAnimationFrame(tick);
    }
  });

  // Block user scroll
  document.addEventListener('wheel', function(e){ e.preventDefault(); }, {passive:false});
  document.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive:false});
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Export VideoScript as a downloadable HTML file.
 */
export async function exportScrollPage(script: VideoScript): Promise<void> {
  const html = buildScrollPageHtml(script);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${script.title || "scroll-page"}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
