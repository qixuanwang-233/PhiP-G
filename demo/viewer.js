'use strict';
// Draws the five static, textured primitives shipped with this fixed example.
async function makeViewer(canvas, parts) {
  const gl = canvas.getContext('webgl', {alpha:true, antialias:true});
  if (!gl) throw Error('WebGL is unavailable. Download the GLB to inspect the result.');
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, `attribute vec3 pos, normal; attribute vec2 uv;
     uniform vec3 shift, right, up, back, center; uniform vec2 scale;
     varying vec2 texUV; varying float light;
     void main(){
       vec3 p=pos+shift-center;
       gl_Position=vec4(dot(p,right)*scale.x, dot(p,up)*scale.y, -dot(p,back)*0.08, 1.);
       texUV=uv;
       light=0.78+0.26*max(0., dot(normalize(normal),normalize(vec3(-0.3,0.85,0.45))));
     }`],
    [gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 texUV; varying float light;
     uniform sampler2D atlas; uniform vec3 tint;
     void main(){gl_FragColor=vec4(texture2D(atlas,texUV).rgb*tint*light,1.);}`]
  ]) {
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error('Shader compilation failed.');
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Could not start the 3D viewer.');
  gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
  const loc = name => gl.getUniformLocation(program,name);
  const attrs=['pos','normal','uv'].map(name=>gl.getAttribLocation(program,name));
  const {model,binary}=parts;
  const buffer=gl.createBuffer(),indices=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,binary,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,binary,gl.STATIC_DRAW);
  function texture(){
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
    return t;
  }
  const white=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
  const textures=await Promise.all(model.images.map(async image=>{
    const v=model.bufferViews[image.bufferView];
    const url=URL.createObjectURL(new Blob([binary.subarray(v.byteOffset,v.byteOffset+v.byteLength)],{type:image.mimeType}));
    try {
      const img=new Image();img.src=url;await img.decode();
      const t=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return t;
    } finally {URL.revokeObjectURL(url);}
  }));
  const uintIndexes=gl.getExtension('OES_element_index_uint');
  const draws=model.nodes.map(node=>{
    const mesh=model.meshes[node.mesh].primitives[0], mat=model.materials[mesh.material].pbrMetallicRoughness;
    const access=id=>{
      const a=model.accessors[id],v=model.bufferViews[a.bufferView];
      return {...a,offset:(v.byteOffset||0)+(a.byteOffset||0),stride:v.byteStride||0};
    };
    if(model.accessors[mesh.indices].componentType===5125 && !uintIndexes)throw Error('32-bit indices unavailable. Download the GLB to inspect the result.');
    return {name:node.name,attrs:['POSITION','NORMAL','TEXCOORD_0'].map(key=>access(mesh.attributes[key])),
      index:access(mesh.indices),texture:mat.baseColorTexture?textures[model.textures[mat.baseColorTexture.index].source]:white,
      tint:mat.baseColorFactor?.slice(0,3)||[1,1,1]};
  });
  let azimuth=1.0,elevation=.24,zoom=1,drag=null,scene=null;
  function draw(){
    if(!scene)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);
    if(!w||!h)return;
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const s=Math.sin(azimuth),c=Math.cos(azimuth),v=Math.sin(elevation),u=Math.cos(elevation);
    gl.uniform3f(loc('right'),c,0,-s);gl.uniform3f(loc('up'),-s*v,u,-c*v);
    gl.uniform3f(loc('back'),s*u,v,c*u);gl.uniform3f(loc('center'),0,1.8,0);
    const scale=2*zoom/7.5;gl.uniform2f(loc('scale'),scale*Math.min(h/w,0.83),scale*Math.min(1,w/h*0.83));
    for(let i=0;i<draws.length;i++){
      const item=draws[i];
      item.attrs.forEach((a,j)=>{gl.enableVertexAttribArray(attrs[j]);gl.vertexAttribPointer(attrs[j],j===2?2:3,a.componentType,false,a.stride,a.offset);});
      gl.uniform3fv(loc('shift'),scene.nodes[i].translation);gl.uniform3fv(loc('tint'),item.tint);
      gl.bindTexture(gl.TEXTURE_2D,item.texture);gl.drawElements(gl.TRIANGLES,item.index.count,item.index.componentType,item.index.offset);
    }
  }
  canvas.onpointerdown=e=>{if(e.button!==0||!e.isPrimary)return;canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY]};
  canvas.onlostpointercapture=()=>drag=null;
  canvas.onpointermove=e=>{
    if(!drag||!e.isPrimary)return;azimuth-=(e.clientX-drag[0])*.012;
    elevation=Math.max(.05,Math.min(1.3,elevation+(e.clientY-drag[1])*.009));
    drag=[e.clientX,e.clientY];draw();
  };
  canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.7,Math.min(3,zoom*Math.exp(-.001*e.deltaY)));draw();};
  canvas.onkeydown=e=>{
    if(!['ArrowLeft','ArrowRight','+','=','-','Home'].includes(e.key))return;
    e.preventDefault();if(e.key==='Home'){azimuth=1;elevation=.24;zoom=1;}
    else if(e.key==='ArrowLeft')azimuth-=.16;else if(e.key==='ArrowRight')azimuth+=.16;
    else zoom=Math.max(.7,Math.min(3,zoom*(e.key==='-'?.9:1.1)));draw();
  };
  new ResizeObserver(draw).observe(canvas);
  return model=>{scene=model;draw()};
}

const go=document.querySelector('#run'),download=document.querySelector('#download'),statusLine=document.querySelector('#status');
const parts=PhiPGDemo.inputs();
document.querySelector('#prompt').textContent=PhiPGDemo.prompt;
let result,viewer;
function run(){
  result=PhiPGDemo.assemble(parts);
  if(viewer)viewer(result.model);
  download.disabled=false;
  statusLine.textContent='Layout complete · 4 objects and ground';
  if(!viewer)statusLine.textContent+=' · '+(viewerError||'Loading viewport…');
}
let viewerError='';
go.onclick=run;
download.onclick=()=>{
  if(!result)return;
  const url=URL.createObjectURL(new Blob([result.glb],{type:'model/gltf-binary'}));
  const a=document.createElement('a');a.href=url;a.download='phip-g-scene.glb';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
};
makeViewer(document.querySelector('canvas'),parts).then(show=>{
  viewer=show;if(result){viewer(result.model);statusLine.textContent='Layout complete · 4 objects and ground';}
}).catch(err=>{viewerError=err.message;statusLine.textContent=viewerError;});
run();
