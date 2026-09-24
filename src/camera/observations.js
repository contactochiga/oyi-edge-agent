const crypto = require('crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function canonicalId(camera) {
  const id = camera.canonical_camera_id || camera.id || camera.camera_id;
  return UUID.test(String(id || '')) ? String(id).toLowerCase() : null;
}
function observation(camera, node, kind, source, result, details = {}, observedAt = new Date().toISOString()) {
  const id = canonicalId(camera);
  if (!id || !node) return null; // Never invent canonical identity from a stream name/host.
  return {schema_version:1,observation_id:crypto.randomUUID(),camera_id:id,edge_node_id:node,
    kind,source,observed_at:observedAt,result,details};
}
function inspectStreams(cameras, node, streams, failed = false, observedAt = new Date().toISOString()) {
  const counts=new Map();for(const camera of cameras)counts.set(camera.stream_id,(counts.get(camera.stream_id)||0)+1);
  return cameras.flatMap(camera => {
    if (!canonicalId(camera) || !camera.stream_id || counts.get(camera.stream_id)!==1) return [];
    if (failed) return [observation(camera,node,'stream','go2rtc_inspection','failed',{error_code:'inspection_failed'},observedAt)];
    const stream = streams?.[camera.stream_id];
    return [observation(camera,node,'stream_configuration','go2rtc_registry',stream?'configured':'not_configured',{},observedAt),
      observation(camera,node,'stream','go2rtc_inspection','inspected',{
        stream_present:!!stream,producer_count:Array.isArray(stream?.producers)?stream.producers.length:0,
        consumer_count:Array.isArray(stream?.consumers)?stream.consumers.length:0,
      },observedAt)];
  }).filter(Boolean);
}
function frameObservation(camera,node,capture,source='go2rtc_snapshot') {
  return observation(camera,node,'frame',source,capture.ok?'acquired':'failed',capture.ok?{
    mime_type:capture.media.mimeType,size_bytes:capture.media.sizeBytes,validation:'bounded_image_signature',
    latency_ms:capture.media.latencyMs,
  }:{error_code:'capture_failed'},capture.media?.capturedAt || capture.observedAt || new Date().toISOString());
}
function inferenceObservation(camera,node,result,latencyMs,observedAt=new Date().toISOString()) {
  const status=result.error?'failed':result.mode==='noop'?'skipped':result.dropped?'dropped':'succeeded';
  return observation(camera,node,'inference','external_detector',status,{
    latency_ms:latencyMs,queue_depth:Number(result.metrics?.queueDepth||0),
    ...(status==='succeeded'?{detection_count:(result.detections||[]).length}:{}),
    ...(status==='failed'?{error_code:'provider_failed'}:status==='skipped'?{error_code:'not_configured'}:status==='dropped'?{error_code:'sampling_bound',dropped_samples:1}:{}),
  },observedAt);
}
function batches(items) { const out=[];for(let i=0;i<items.length;i+=128)out.push(items.slice(i,i+128));return out; }
module.exports={canonicalId,observation,inspectStreams,frameObservation,inferenceObservation,batches};
