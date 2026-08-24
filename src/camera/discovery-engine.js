const net = require("net");
const onvifDefault = require("onvif");
const { fingerprint, safeError } = require("./contracts");

const PORTS = [80, 554, 8000, 8080, 8899];
const MAX_HOSTS = 256;
const MAX_TIMEOUT_MS = 30_000;

function isPrivateIpv4(ip) {
  const parts = String(ip || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}
function cidrHosts(cidr) {
  const [address, prefixRaw] = String(cidr || "").split("/"); const prefix = Number(prefixRaw);
  if (!isPrivateIpv4(address) || !Number.isInteger(prefix) || prefix < 24 || prefix > 30) throw Object.assign(new Error("CIDR must be a private /24 to /30 network"), { code:"invalid_discovery_scope" });
  const value = address.split(".").reduce((sum, part) => (sum << 8) + Number(part), 0) >>> 0;
  const mask = (0xffffffff << (32 - prefix)) >>> 0; const network = value & mask; const size = 2 ** (32 - prefix);
  if (size - 2 > MAX_HOSTS) throw Object.assign(new Error("CIDR exceeds discovery host limit"), { code:"invalid_discovery_scope" });
  return Array.from({length:Math.max(0,size-2)},(_,i)=>network+i+1).map((n)=>[24,16,8,0].map((s)=>(n>>>s)&255).join("."));
}
function probeTcp(host, port, timeoutMs = 300) { return new Promise((resolve) => { const socket = net.createConnection({host,port}); let done=false; const finish=(ok)=>{if(done)return;done=true;socket.destroy();resolve(ok)}; socket.setTimeout(timeoutMs); socket.once("connect",()=>finish(true)); socket.once("timeout",()=>finish(false)); socket.once("error",()=>finish(false)); }); }
async function mapLimit(values, limit, work) { const output=new Array(values.length);let index=0;await Promise.all(Array.from({length:Math.min(limit,values.length||1)},async()=>{while(index<values.length){const at=index++;output[at]=await work(values[at]);}}));return output; }
function connect(onvif, hostname, port, credentials, timeoutMs) { return new Promise((resolve,reject)=>{new onvif.Cam({hostname,port,username:credentials.username||"",password:credentials.password||"",timeout:timeoutMs},function(err){if(err)return reject(err);resolve(this);});}); }
function deviceInfo(cam) { return new Promise((resolve)=>cam.getDeviceInformation((err,info)=>resolve(err?{}:info||{}))); }
function streamUri(cam) { return new Promise((resolve)=>cam.getStreamUri({protocol:"RTSP"},(err,stream)=>resolve(err?null:String(stream?.uri||"")||null))); }
function profileCapabilities(cam) { const profiles=Array.isArray(cam?.profiles)?cam.profiles:[]; return { profiles:profiles.slice(0,16).map((p)=>({token:String(p?.$?.token||p?.token||""),name:String(p?.name||"").slice(0,120)})), audio:profiles.some((p)=>Boolean(p?.audioEncoderConfiguration)), ptz:profiles.some((p)=>Boolean(p?.PTZConfiguration||p?.ptzConfiguration)) }; }
function candidateFrom(cam, discovery, info, uri, discoveredAt, requiresAuthentication = false) {
  const host=String(discovery.address||discovery.hostname||cam.hostname||""); const xaddr=String(discovery.xaddr||discovery.xAddr||""); const endpointUuid=String(discovery.urn||discovery.uuid||discovery.endpointReference||"");
  const fp=fingerprint({endpointUuid,serialNumber:info.serialNumber,hardwareId:info.hardwareId,manufacturer:info.manufacturer,model:info.model,hostname:host,xaddrIdentity:xaddr.replace(/https?:\/\/[^/]+/i,"onvif-host")});
  const caps=profileCapabilities(cam);
  return { discoveryId:fp, fingerprint:fp, provider:"onvif", manufacturer:String(info.manufacturer||"")||null, model:String(info.model||"")||null, serialNumber:String(info.serialNumber||"")||null, firmwareVersion:String(info.firmwareVersion||"")||null, hostname:host||null, ipAddress:isPrivateIpv4(host)?host:null, onvifPort:Number(cam.port||discovery.port||80), onvifAvailable:true, rtspAvailable:Boolean(uri), requiresAuthentication, profiles:caps.profiles, capabilities:{onvif:"available",rtsp:uri?"available":"unknown",snapshots:"unknown",ptz:caps.ptz?"available":"unknown",audio:caps.audio?"available":"unknown",recording:"unavailable",anpr:"unavailable",faceRecognition:"unavailable"}, endpointUuid:endpointUuid||null, xaddrIdentity:xaddr.replace(/https?:\/\/[^/]+/i,"onvif-host")||null, discoveredAt };
}
async function discoverOne(discovery, options) { try { const cam=await connect(options.onvif,discovery.address,discovery.port,options.credentials,options.timeoutMs); const info=await deviceInfo(cam); const uri=await streamUri(cam); return {candidate:candidateFrom(cam,discovery,info,uri,options.discoveredAt),local:{fingerprint:null,rtspUri:uri,xaddr:discovery.xaddr||null},error:null}; } catch(error) { const auth=/auth|unauthor|401|password/i.test(String(error?.message||"")); if(auth){const shell={hostname:discovery.address,port:discovery.port,profiles:[]};return{candidate:candidateFrom(shell,discovery,{},null,options.discoveredAt,true),local:null,error:safeError("camera_auth_failed","Camera authentication is required.")};} return {candidate:null,local:null,error:safeError("onvif_unreachable","ONVIF device could not be reached.")}; } }
function wsProbe(onvif, timeoutMs) { return new Promise((resolve)=>{let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;resolve([])}},timeoutMs);onvif.Discovery.probe((err,cams)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(err||!Array.isArray(cams)?[]:cams.map((cam)=>({address:cam.address,port:cam.port||80,xaddr:cam.xaddrs?.[0]||cam.xaddr,urn:cam.urn||cam.uuid})).filter((cam)=>isPrivateIpv4(cam.address)));});}); }
async function discoverCameras(request, dependencies={}) {
  const startedAt=Date.now(); const onvif=dependencies.onvif||onvifDefault; const timeoutMs=Math.min(MAX_TIMEOUT_MS,Math.max(1000,Number(request.timeoutMs||8000))); const discoveredAt=new Date().toISOString();
  let endpoints=[]; if(request.mode!=="subnet") endpoints.push(...await wsProbe(onvif,Math.min(timeoutMs,8000)));
  if((request.mode==="subnet"||request.mode==="all")&&request.cidr){const hosts=cidrHosts(request.cidr);const live=await mapLimit(hosts,32,async(host)=>{for(const port of PORTS){if(await (dependencies.probeTcp||probeTcp)(host,port,250))return{address:host,port,xaddr:`http://${host}:${port}/onvif/device_service`};}return null});endpoints.push(...live.filter(Boolean));}
  const unique=Array.from(new Map(endpoints.map((item)=>[`${item.address}:${item.port}`,item])).values()).slice(0,MAX_HOSTS);
  const results=await mapLimit(unique,8,(item)=>discoverOne(item,{onvif,credentials:dependencies.credentials||{},timeoutMs:Math.min(timeoutMs,5000),discoveredAt}));
  const candidates=results.filter((r)=>r.candidate).map((r)=>r.candidate); const errors=results.filter((r)=>r.error).map((r)=>r.error);
  return { requestId:request.requestId, mode:request.mode, candidates, errors:errors.slice(0,50), startedAt:new Date(startedAt).toISOString(),completedAt:new Date().toISOString(),durationMs:Date.now()-startedAt };
}

module.exports = { MAX_HOSTS, cidrHosts, discoverCameras, isPrivateIpv4, probeTcp };
