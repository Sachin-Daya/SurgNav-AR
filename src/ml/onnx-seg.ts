import * as ort from "onnxruntime-web";
import { FLAGS } from "../config";

export async function runSegmentationIfEnabled(currentCase:any){
  if (!FLAGS.mlEnabled) return;
  try{
    const session = await ort.InferenceSession.create("/ml/onnx/unet2d.onnx").catch(()=>null);
    if (!session){ console.log("[ML] No ONNX model found; using precomputed mask if available."); return; }
    console.log("[ML] ONNX session initialized");
    // TODO: wire input tensor from an image or slice
  }catch(e){ console.warn("[ML] init failed", e); }
}
