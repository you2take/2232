const C=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
uniform vec4 rotation;
uniform vec2 frame;
uniform float depth;
out vec3 surfaceNormal;
vec3 turn(vec3 p) {
  p=vec3(rotation.z*p.x+rotation.w*p.z,p.y,-rotation.w*p.x+rotation.z*p.z);
  return vec3(p.x,rotation.x*p.y-rotation.y*p.z,rotation.y*p.y+rotation.x*p.z);
}
void main() {
  vec3 p=turn(vec3(position.x,-position.y,position.z*depth));
  surfaceNormal=turn(vec3(normal.x,-normal.y,normal.z/max(depth,0.001)));
  gl_Position=vec4(p.xy/frame,(-2.0*p.z-60.1)/99.9,1.0);
}`,M=`#version 300 es
precision highp float;
in vec3 surfaceNormal;
uniform vec3 baseColor;
uniform vec3 material;
out vec4 color;
const float PI=3.14159265;
vec3 light(vec3 n,vec3 l,vec3 energy,vec3 f0) {
  vec3 h=normalize(l+vec3(0.0,0.0,1.0));
  float nl=max(dot(n,l),0.0),nv=max(n.z,0.001),nh=max(dot(n,h),0.0);
  float a=pow(material.y,4.0),d=nh*nh*(a-1.0)+1.0;
  float distribution=a/max(PI*d*d,0.0001);
  float k=pow(material.y+1.0,2.0)*0.125;
  float geometry=nv/(nv*(1.0-k)+k)*nl/(nl*(1.0-k)+k);
  vec3 fresnel=f0+(1.0-f0)*pow(1.0-max(h.z,0.0),5.0);
  vec3 diffuse=(1.0-fresnel)*(1.0-material.x)*baseColor/PI;
  vec3 specular=distribution*geometry*fresnel/max(4.0*nl*nv,0.001);
  return (diffuse+specular)*energy*nl;
}
vec3 aces(vec3 c) {
  c*=1.03;
  return clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);
}
vec3 srgb(vec3 c) {
  return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));
}
void main() {
  vec3 n=normalize(surfaceNormal),f0=mix(vec3(0.04),baseColor,material.x);
  // A broad neutral studio fill keeps every angle legible without a PMREM map.
  float sky=0.43+0.12*n.y;
  vec3 result=baseColor*sky*(1.0-0.45*material.x)+f0*0.22;
  result+=light(n,normalize(vec3(-4.0,6.0,6.0)),vec3(2.8),f0);
  result+=light(n,normalize(vec3(4.0,2.0,-3.0)),vec3(0.88,0.93,1.0)*1.4,f0);
  result+=baseColor*material.z;
  color=vec4(srgb(aces(result)),1.0);
}`;export function linearColor(s,e=new Float32Array(3)){for(let a=0;a<3;a+=1){const n=parseInt(s.slice(1+a*2,3+a*2),16)/255;e[a]=n<=.04045?n/12.92:((n+.055)/1.055)**2.4}return e}export function createLogoRenderer(s){const e=s.getContext("webgl2",{alpha:!0,antialias:!0,depth:!0,stencil:!1,powerPreference:"low-power"});if(!e)throw Error("WebGL2 unavailable");const a=[];for(const[r,o]of[[e.VERTEX_SHADER,C],[e.FRAGMENT_SHADER,M]]){const t=e.createShader(r);e.shaderSource(t,o),e.compileShader(t),a.push(t)}const n=e.createProgram();a.forEach(r=>e.attachShader(n,r)),e.linkProgram(n);const w=e.getExtension("KHR_parallel_shader_compile");let f,m=1,p=1,h=Math.min(devicePixelRatio,1.75),i=!1;const d=[],v=[],A=linearColor("#f3f4f6"),R=linearColor("#777b86"),x=new Float32Array(3);e.enable(e.DEPTH_TEST),e.enable(e.CULL_FACE),e.frontFace(e.CW),e.clearColor(0,0,0,0);function g(r,o,t){s.width=Math.max(1,Math.round(r*t)),s.height=Math.max(1,Math.round(o*t)),e.viewport(0,0,s.width,s.height)}function T(r,o){m=r,p=o,h=Math.min(devicePixelRatio,1.75),g(m,p,h)}function _(r,o){if(i)throw Error("Logo renderer disposed");for(const t of r){const c=e.createVertexArray();e.bindVertexArray(c);for(const[F,E]of[["position",0],["normal",1]]){const u=t.attributes[F],z=u.type==="Int16"?Int16Array:Float32Array,b=e.createBuffer();v.push(b),e.bindBuffer(e.ARRAY_BUFFER,b),e.bufferData(e.ARRAY_BUFFER,new z(o,u.offset,u.length),e.STATIC_DRAW),e.enableVertexAttribArray(E),e.vertexAttribPointer(E,u.itemSize,u.type==="Int16"?e.SHORT:e.FLOAT,!!u.normalized,0,0)}const l=e.createBuffer();v.push(l),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,l),e.bufferData(e.ELEMENT_ARRAY_BUFFER,new Uint32Array(o,t.index.offset,t.index.length),e.STATIC_DRAW),d.push({vao:c,groups:t.groups,pink:t.pink})}e.bindVertexArray(null)}async function P(){if(i||e.isContextLost())throw Error("Logo preparation interrupted");if(w){const r=performance.now()+2e3;for(;!e.getProgramParameter(n,w.COMPLETION_STATUS_KHR);){if(i||e.isContextLost())throw Error("Logo preparation interrupted");if(performance.now()>r)throw Error("Logo shader preparation timed out");await new Promise(o=>setTimeout(o,10))}}if(!e.getProgramParameter(n,e.LINK_STATUS))throw Error("Logo shader unavailable");f=Object.fromEntries(["rotation","frame","depth","baseColor","material"].map(r=>[r,e.getUniformLocation(n,r)])),a.forEach(r=>e.deleteShader(r)),a.length=0}function y(r){if(!f||i)return;e.useProgram(n),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT);const o=4.176*p/m;e.uniform2f(f.frame,4.176,o),e.uniform4f(f.rotation,Math.cos(r.x),Math.sin(r.x),Math.cos(r.y),Math.sin(r.y)),e.uniform1f(f.depth,Math.max(.001,r.depth));for(let t=0;t<3;t+=1)x[t]=r.tint[t]*.58;for(const t of d){e.bindVertexArray(t.vao);for(const c of t.groups){const l=c.materialIndex===0;e.uniform3fv(f.baseColor,t.pink?l?r.tint:x:l?A:R),e.uniform3f(f.material,(l?.28:.42)*r.materialDepth,l?.65-.09*r.materialDepth:.62,l?(1-r.materialDepth)*.35:0),e.drawElements(e.TRIANGLES,c.count,e.UNSIGNED_INT,c.start*4)}}e.bindVertexArray(null)}async function L(r){if(await P(),i)throw Error("Logo warmup interrupted");const o=performance.now();g(32,16,1),y(r);const t=performance.now();if(await new Promise(requestAnimationFrame),await new Promise(requestAnimationFrame),i||e.isContextLost())throw Error("Logo warmup interrupted");const c=performance.now();return g(m,p,h),{submitMs:t-o,readyMs:c-o}}function S(){i||(i=!0,d.forEach(r=>e.deleteVertexArray(r.vao)),v.forEach(r=>e.deleteBuffer(r)),a.forEach(r=>e.deleteShader(r)),e.deleteProgram(n))}return{resize:T,upload:_,render:y,warmup:L,dispose:S}}
