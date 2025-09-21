export const FLAGS = {
  mlEnabled: true,
  trueXYZMapping: false,
  slicePanel: false,
  handsFreeMode: false,
  desktopBridge: false
} as const;

export const CASES = [
  { id: "case01", name: "Demo Case 01", glb: "/data/cases/case01.glb", mask: "/data/cases/case01_mask.png", meta: "/data/cases/case01.json" }
];

export const MARKER = {
  patternUrl: "/markers/hiro.patt",
  cameraParamsUrl: "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/three.js/data/camera_para.dat"
};
