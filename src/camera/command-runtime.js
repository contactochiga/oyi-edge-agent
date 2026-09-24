const { discoverCameras } = require("./discovery-engine");
const { captureSnapshot } = require("./snapshot");

function credentialKey(ref) { return String(ref||"").replace(/^local:/,"").replace(/[^a-zA-Z0-9]+/g,"_").toUpperCase(); }
function localCredentials(ref, env=process.env) { if(!ref)return{};const key=credentialKey(ref);return{username:env[`EDGE_CREDENTIAL_${key}_USER`]||"",password:env[`EDGE_CREDENTIAL_${key}_PASS`]||""}; }
function validCommand(command, identity, now=Date.now()) {
  if(!command||!["camera.discovery","camera.snapshot"].includes(command.type))return{ok:false,code:"unsupported_device"};
  if(String(command.siteId||"")!==String(identity.siteId||"")||String(command.edgeNodeId||"")!==String(identity.agentId||""))return{ok:false,code:"scope_conflict"};
  if(!command.expiresAt||Date.parse(command.expiresAt)<=now)return{ok:false,code:"expired_command"};
  if(!command.id||!command.payload?.requestId||command.type==="camera.snapshot"&&!command.payload?.cameraId)return{ok:false,code:"unsupported_device"};
  return{ok:true};
}
async function executeCameraCommand(command, identity, dependencies={}) {
  const validation=validCommand(command,identity,dependencies.now?.()||Date.now()); if(!validation.ok)return{ok:false,commandId:command?.id||null,error:{code:validation.code,message:"Edge command is invalid or outside this node scope."}};
  const payload=command.payload;
  if(command.type==="camera.snapshot"){const capture=await captureSnapshot(payload.streamId||payload.cameraId,{axios:dependencies.axios,go2rtcUrl:dependencies.go2rtcUrl,timeoutMs:payload.timeoutMs});return capture.ok?{ok:true,commandId:command.id,requestId:payload.requestId,media:{...capture.media,cameraId:payload.cameraId,eventId:payload.eventId||null,kind:payload.kind||"snapshot",retention:payload.retention||"standard"}}:{ok:false,commandId:command.id,error:capture.error};}
  const result=await discoverCameras({requestId:payload.requestId,mode:payload.mode||"onvif",cidr:payload.cidr,timeoutMs:payload.timeoutMs},{onvif:dependencies.onvif,probeTcp:dependencies.probeTcp,credentials:localCredentials(payload.credentialRef,dependencies.env)});
  return{ok:true,commandId:command.id,requestId:payload.requestId,result};
}
module.exports={credentialKey,executeCameraCommand,localCredentials,validCommand};
