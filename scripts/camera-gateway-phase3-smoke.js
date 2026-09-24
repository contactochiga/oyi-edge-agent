const assert = require("assert");
const fs = require("fs");
const { cidrHosts, discoverCameras } = require("../src/camera/discovery-engine");
const { fingerprint, streamId } = require("../src/camera/contracts");
const { localCredentials, validCommand } = require("../src/camera/command-runtime");
const { cameraHealth } = require("../src/camera/health");

assert.equal(cidrHosts("192.168.20.0/30").length, 2);
assert.throws(() => cidrHosts("8.8.8.0/24"));
assert.throws(() => cidrHosts("192.168.0.0/16"));
assert.equal(fingerprint({ endpointUuid:"uuid-a", hostname:"192.168.1.5" }), fingerprint({ endpointUuid:"uuid-a", hostname:"192.168.1.99" }));
assert.equal(streamId("12345678-abcd"), "12345678-abcd");
assert.deepEqual(localCredentials("local:front-gate", { EDGE_CREDENTIAL_FRONT_GATE_USER:"u", EDGE_CREDENTIAL_FRONT_GATE_PASS:"p" }), { username:"u", password:"p" });
assert.equal(validCommand({type:"camera.discovery",siteId:"a",edgeNodeId:"n",expiresAt:new Date(Date.now()+1000).toISOString(),id:"c",payload:{requestId:"r"}},{siteId:"b",agentId:"n"}).code,"scope_conflict");
assert.equal(validCommand({type:"camera.discovery",siteId:"a",edgeNodeId:"n",expiresAt:new Date(0).toISOString(),id:"c",payload:{requestId:"r"}},{siteId:"a",agentId:"n"}).code,"expired_command");
assert.equal(cameraHealth({id:"12345678-abcd"},{"12345678-abcd":{producers:[{}]}}).state,"producer_present");

class FakeCam { constructor(options, callback) { this.hostname=options.hostname;this.port=options.port;this.profiles=[];setImmediate(()=>callback.call(this,null)); } getDeviceInformation(cb){cb(null,{manufacturer:"Oyi Test",model:"T1",serialNumber:"SER-1"});} getStreamUri(_o,cb){cb(null,{uri:"rtsp://user:secret@192.168.1.9/live"});} }
const fakeOnvif={Cam:FakeCam,Discovery:{probe(cb){cb(null,[{address:"192.168.1.9",port:80,urn:"uuid-camera-1",xaddrs:["http://192.168.1.9/onvif/device_service"]}]);}}};
(async()=>{
  const result=await discoverCameras({requestId:"r1",mode:"onvif",timeoutMs:1000},{onvif:fakeOnvif});
  assert.equal(result.candidates.length,1); assert.equal(result.candidates[0].rtspAvailable,true);
  assert.equal(result.probeObservations[0].result,'succeeded');assert.ok(Number.isFinite(Date.parse(result.probeObservations[0].observedAt)));
  assert.equal(JSON.stringify(result).includes("secret"),false,"RTSP credentials must stay local");
  class AuthCam { constructor(_options,callback){setImmediate(()=>callback(new Error("401 Unauthorized")));} }
  const authResult=await discoverCameras({requestId:"r2",mode:"onvif",timeoutMs:1000},{onvif:{Cam:AuthCam,Discovery:fakeOnvif.Discovery}});
  assert.equal(authResult.candidates[0].requiresAuthentication,true);
  assert.equal(authResult.candidates[0].rtspAvailable,false);
  assert.equal(authResult.probeObservations[0].result,'authentication_failed');
  class FailedCam {constructor(_o,cb){setImmediate(()=>cb(new Error('timeout')))}}
  const failed=await discoverCameras({requestId:'r3',mode:'onvif',timeoutMs:1000},{onvif:{Cam:FailedCam,Discovery:fakeOnvif.Discovery}});
  assert.equal(failed.probeObservations[0].result,'failed');
  const absent=await discoverCameras({requestId:'r4',mode:'onvif',timeoutMs:1000},{onvif:{Cam:FailedCam,Discovery:{probe:cb=>cb(null,[])}}});
  assert.deepEqual(absent.probeObservations,[]);
  const generator=fs.readFileSync(require.resolve("./generate-go2rtc-config"),"utf8");
  assert(generator.includes("0o600")&&generator.includes("renameSync"),"go2rtc config must be restrictive and atomic");
  console.log("camera gateway phase3 smoke: ok");
})().catch((error)=>{console.error(error);process.exit(1)});
