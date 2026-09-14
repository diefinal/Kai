import { Document, NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const document = new Document();
document.createBuffer();
document.createScene('Scene');
io.write('d:/Kai/apps/desktop/public/models/kai.glb', document);
console.log('Valid GLB created');
