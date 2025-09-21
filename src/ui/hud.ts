import { CASES, FLAGS } from "../config";

type Metrics = { angleDeg: number|null; depth: number|null; entrySet: boolean; targetSet: boolean };

export function buildHUD(opts: { onCaseChange:(id:string)=>void; onReset:()=>void; onToggleML:(v:boolean)=>void; }) {
  const hud = document.getElementById("hud")!;
  hud.innerHTML = "";
  const bar = document.createElement("div"); bar.className = "bar";
  const sel = document.createElement("select");
  for (const c of CASES){ const o=document.createElement("option"); o.value=c.id; o.textContent=c.name; sel.appendChild(o); }
  sel.onchange = ()=> opts.onCaseChange(sel.value);
  bar.appendChild(sel);

  const ml = document.createElement("button"); ml.textContent = `ML: ${FLAGS.mlEnabled ? "ON":"OFF"}`;
  ml.onclick = ()=>{ (FLAGS as any).mlEnabled=!FLAGS.mlEnabled; ml.textContent=`ML: ${FLAGS.mlEnabled?"ON":"OFF"}`; opts.onToggleML(FLAGS.mlEnabled); };
  bar.appendChild(ml);

  const reset = document.createElement("button"); reset.textContent = "Reset"; reset.onclick = ()=> opts.onReset(); bar.appendChild(reset);

  hud.appendChild(bar);

  const metrics = document.createElement("div"); metrics.className="bar"; metrics.style.background="rgba(0,0,0,.35)";
  hud.appendChild(metrics);

  function setMetrics(m: Metrics) {
    metrics.textContent = `Angle: ${m.angleDeg==null?"—":m.angleDeg.toFixed(1)}°, Depth: ${m.depth==null?"—":m.depth.toFixed(1)} mm | Entry ${m.entrySet?"✅":"—"} Target ${m.targetSet?"✅":"—"}`;
  }
  function showLoading(v:boolean){ hud.style.opacity = v? "0.6":"1"; }
  function setFps(f:number){ /* optional later */ }

  return { setMetrics, showLoading, setFps };
}
