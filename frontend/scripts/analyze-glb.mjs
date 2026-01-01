import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const glbPath = join(__dirname, '../public/models/claw-machine/Claw_MachineGLB.glb');

function parseGLB(buffer) {
  const view = new DataView(buffer.buffer);
  
  // GLB header
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const length = view.getUint32(8, true);
  
  console.log(`GLB Magic: 0x${magic.toString(16)} (should be 0x46546C67 = "glTF")`);
  console.log(`GLB Version: ${version}`);
  console.log(`GLB Total Length: ${length} bytes\n`);
  
  // First chunk (JSON)
  const chunk0Length = view.getUint32(12, true);
  const chunk0Type = view.getUint32(16, true);
  
  // Extract JSON
  const jsonData = buffer.slice(20, 20 + chunk0Length).toString('utf8');
  const gltf = JSON.parse(jsonData);
  
  return gltf;
}

function analyzeGLTF(gltf) {
  console.log('=== GLTF Model Analysis ===\n');
  
  // Nodes
  console.log(`Total Nodes: ${gltf.nodes?.length || 0}`);
  console.log(`Total Meshes: ${gltf.meshes?.length || 0}`);
  console.log(`Total Accessors: ${gltf.accessors?.length || 0}\n`);
  
  console.log('--- All Nodes ---\n');
  
  if (gltf.nodes) {
    gltf.nodes.forEach((node, index) => {
      const name = node.name || `(unnamed-${index})`;
      const translation = node.translation || [0, 0, 0];
      const scale = node.scale || [1, 1, 1];
      const meshIndex = node.mesh;
      
      console.log(`Node ${index}: "${name}"`);
      console.log(`  Translation: [${translation.map(v => v.toFixed(3)).join(', ')}]`);
      console.log(`  Scale: [${scale.map(v => v.toFixed(3)).join(', ')}]`);
      
      if (meshIndex !== undefined) {
        const mesh = gltf.meshes[meshIndex];
        console.log(`  Mesh: "${mesh.name || `mesh-${meshIndex}`}"`);
        
        // Get bounds from accessor if available
        mesh.primitives?.forEach((prim, primIdx) => {
          if (prim.attributes?.POSITION !== undefined) {
            const accessor = gltf.accessors[prim.attributes.POSITION];
            if (accessor.min && accessor.max) {
              console.log(`  Primitive ${primIdx} Bounds:`);
              console.log(`    X: [${accessor.min[0].toFixed(3)}, ${accessor.max[0].toFixed(3)}]`);
              console.log(`    Y: [${accessor.min[1].toFixed(3)}, ${accessor.max[1].toFixed(3)}]`);
              console.log(`    Z: [${accessor.min[2].toFixed(3)}, ${accessor.max[2].toFixed(3)}]`);
            }
          }
        });
      }
      
      if (node.children?.length) {
        console.log(`  Children: [${node.children.join(', ')}]`);
      }
      
      console.log('');
    });
  }
  
  // Find glass-related nodes
  console.log('\n--- Glass/Claw Related Nodes ---\n');
  if (gltf.nodes) {
    gltf.nodes.forEach((node, index) => {
      const name = (node.name || '').toLowerCase();
      if (name.includes('glass') || name.includes('claw') || name.includes('manip') || 
          name.includes('scroll') || name.includes('base') || name.includes('body')) {
        console.log(`"${node.name}" (index: ${index})`);
        const translation = node.translation || [0, 0, 0];
        console.log(`  Translation: [${translation.map(v => v.toFixed(3)).join(', ')}]`);
        
        if (node.mesh !== undefined) {
          const mesh = gltf.meshes[node.mesh];
          mesh.primitives?.forEach((prim) => {
            if (prim.attributes?.POSITION !== undefined) {
              const accessor = gltf.accessors[prim.attributes.POSITION];
              if (accessor.min && accessor.max) {
                console.log(`  Bounds: X[${accessor.min[0].toFixed(2)}, ${accessor.max[0].toFixed(2)}] Y[${accessor.min[1].toFixed(2)}, ${accessor.max[1].toFixed(2)}] Z[${accessor.min[2].toFixed(2)}, ${accessor.max[2].toFixed(2)}]`);
              }
            }
          });
        }
        console.log('');
      }
    });
  }
}

// Main
const buffer = readFileSync(glbPath);
const gltf = parseGLB(buffer);
analyzeGLTF(gltf);
