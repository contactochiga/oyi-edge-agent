const assert=require('assert/strict');const fs=require('fs');const os=require('os');const path=require('path');
const {observation,inspectStreams,frameObservation,inferenceObservation,batches,canonicalId}=require('../src/camera/observations');
const {captureSnapshot}=require('../src/camera/snapshot');const {CameraInferenceRuntime}=require('../src/camera/inference-runtime');
const {DetectionOutbox}=require('../src/camera/detection-outbox');const {cameraHealth}=require('../src/camera/health');
const camera={canonical_camera_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',stream_id:'recorder-channel-12'},node='edge-a',at='2026-09-24T09:00:00.000Z';
(async()=>{
 assert.equal(canonicalId({camera_id:'external-stream'}),null);
 let reports=inspectStreams([camera],node,{'recorder-channel-12':{source:'rtsp://configured-only'}},false,at);
 assert.equal(reports[0].result,'configured');assert.equal(reports[1].details.producer_count,0);assert.ok(reports.every(r=>r.camera_id===camera.canonical_camera_id&&r.observed_at===at));
 assert.equal(cameraHealth({id:'stream'},{stream:{source:'rtsp://only-config'}}).streamAvailable,null);
 reports=inspectStreams([camera],node,null,true,at);assert.equal(reports.length,1);assert.equal(reports[0].result,'failed');assert.equal(reports[0].observed_at,at);
 assert.deepEqual(inspectStreams([],node,{}),[]);console.log('PASS configuration is not reachability/video; failed inspection never repeats cached success');
 const capture=await captureSnapshot('recorder-channel-12',{axios:{get:async()=>({data:Buffer.from([255,216,255,1]),headers:{'content-type':'image/jpeg'}})}});
 const frame=frameObservation(camera,node,capture);assert.equal(frame.result,'acquired');assert.equal(frame.observed_at,capture.media.capturedAt);assert.equal(frame.details.validation,'bounded_image_signature');assert.ok(!JSON.stringify(frame).includes('base64'));
 const invalid=await captureSnapshot('stream',{axios:{get:async()=>({data:Buffer.from('invalid'),headers:{'content-type':'image/jpeg'}})}});assert.equal(frameObservation(camera,node,invalid).result,'failed');
 console.log('PASS actual snapshot helper produces signature-bounded acquisition or explicit failed attempt');
 const runtime=new CameraInferenceRuntime({detect:async()=>({detections:[]}),health:()=>({status:'available'})});
 const zero=await runtime.sample({id:camera.canonical_camera_id},Buffer.from('fixture'));const inference=inferenceObservation(camera,node,zero,1,at);assert.equal(inference.result,'succeeded');assert.equal(inference.details.detection_count,0);
 assert.equal(inferenceObservation(camera,node,{error:true},1,at).result,'failed');assert.equal(inferenceObservation(camera,node,{mode:'noop'},1,at).result,'skipped');assert.equal(inferenceObservation(camera,node,{dropped:true},1,at).result,'dropped');
 console.log('PASS zero detections success differs from failed/skipped/dropped; no cumulative health claim');
 // Actual processor path against local stubs, never camera/provider hardware.
 process.env.AGENT_ID=node;process.env.CLOUD_URL='http://127.0.0.1:1';
 const axios=require('axios'),oldGet=axios.get;
 axios.get=async()=>({data:Buffer.from([255,216,255,1]),headers:{'content-type':'image/jpeg'}});
 const server=require('http').createServer((_req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({detections:[]}))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const {processCamera}=require('./camera-ai-processor');
  process.env.YOLO_BRIDGE_URL=`http://127.0.0.1:${server.address().port}`;
  const observations=[];const result=await processCamera(camera,{}, {observations});
  assert.equal(result.detections,0);assert.equal(observations[0].result,'acquired');assert.equal(observations[1].result,'succeeded');
  process.env.YOLO_BRIDGE_URL='http://127.0.0.1:1';const failed=[];await processCamera(camera,{}, {observations:failed});assert.equal(failed[1].result,'failed');
  process.env.YOLO_BRIDGE_URL='';const skipped=[];await processCamera(camera,{}, {observations:skipped});assert.equal(skipped[1].result,'skipped');
  assert.equal((await runtime.sample({id:camera.canonical_camera_id},Buffer.from('fixture'))).dropped,true);
 }finally{axios.get=oldGet;await new Promise(resolve=>server.close(resolve))}
 console.log('PASS real processor emits frame + zero-detection success, provider failure and not-configured skip');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'oyi-observation-test-'));try{
  const outbox=new DetectionOutbox(path.join(temp,'outbox.json'));const original={observations:[frame,inference,observation(camera,node,'reachability','onvif_probe','failed',{},at)].filter(Boolean)};
  // Use the same envelope fields for every replayed dimension.
  outbox.enqueue({idempotencyKey:'batch',body:original});outbox.enqueue({idempotencyKey:'batch',body:original});assert.equal(outbox.load().length,1);
  await outbox.flush(async()=>{throw Error('offline')});await new DetectionOutbox(path.join(temp,'outbox.json')).flush(async row=>assert.deepEqual(row.body,original));assert.equal(outbox.load().length,0);
 }finally{fs.rmSync(temp,{recursive:true})}
 for(const n of [10,50,100])assert.equal(batches(inspectStreams(Array.from({length:n},(_,i)=>({...camera,stream_id:'stream-'+i})),node,{})).length,Math.ceil(n*2/128));
 console.log('PASS durable offline replay preserves IDs/source timestamps; bounded 10/50/100-camera stream batches');
 console.log('Slice14C Edge: passed');
})().catch(e=>{console.error(e);process.exitCode=1});
