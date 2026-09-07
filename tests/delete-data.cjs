const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {test}=require('node:test');
const source=ts.transpileModule(fs.readFileSync('app/delete-data.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function setup({confirm=true,result={data:[{id:'row-1'}],error:null},disabled=false,table='students'}={}){
 const calls=[],states=[],refs=[];let si=0,ri=0;let resolved=0;
 const chain={delete(){calls.push(['delete']);return this},eq(k,v){calls.push(['eq',k,v]);return this},async select(v){calls.push(['select',v]);return await result}};
 const mod={exports:{}};
 const jsx=(type,props)=>({type,props});
 vm.runInNewContext(source,{exports:mod.exports,require:(p)=>p==='react'?{useState:(initial)=>{const i=si++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=v]},useRef:(initial)=>{const i=ri++;return refs[i]??(refs[i]={current:initial})}}:p==='react/jsx-runtime'?{jsx,jsxs:jsx}:p==='lucide-react'?{Trash2:'icon'}:{sb:{from(t){calls.push(['from',t]);return chain}}},window:{confirm(message){calls.push(['confirm',message]);return confirm}}});
 const props={table,id:'row-1',schoolId:'school-1',name:'Contoh',disabled,onBusyChange:v=>calls.push(['busy',v]),onDeleted:async()=>{resolved++}};
 const render=()=>{si=0;ri=0;return mod.exports.default(props)};
 const click=()=>render().props.children[0].props.onClick();
 return {calls,states,click,get resolved(){return resolved}};
}
test('cancel never reaches database',async()=>{const x=setup({confirm:false});await x.click();assert.equal(x.calls.some(c=>c[0]==='from'),false);assert.equal(x.resolved,0)});
test('disabled never opens confirmation',async()=>{const x=setup({disabled:true});await x.click();assert.equal(x.calls.length,0)});
test('delete is scoped to one row and school and confirms result',async()=>{const x=setup();await x.click();assert.deepEqual(x.calls.filter(c=>['eq','select'].includes(c[0])),[['eq','id','row-1'],['eq','school_id','school-1'],['select','id']]);assert.equal(x.resolved,1)});
test('student cascade warning is explicit',async()=>{const x=setup({confirm:false});await x.click();assert.match(x.calls[0][1],/pembinaan.*tindak lanjut.*terhapus/)});
test('master history preservation is explained',async()=>{const x=setup({table:'master_items',confirm:false});await x.click();assert.match(x.calls[0][1],/Riwayat kejadian lama tetap/)});
test('no affected row is not reported as success',async()=>{const x=setup({result:{data:[],error:null}});await x.click();assert.equal(x.resolved,0);assert.match(x.states[1],/tidak terhapus/)});
test('database errors stay visible',async()=>{const x=setup({result:{data:null,error:{message:'Denied'}}});await x.click();assert.equal(x.resolved,0);assert.equal(x.states[1],'Denied')});
test('double click sends one request',async()=>{let finish;const pending=new Promise(r=>finish=r);const x=setup({result:pending});const first=x.click();await x.click();finish({data:[{id:'row-1'}],error:null});await first;assert.equal(x.calls.filter(c=>c[0]==='delete').length,1)});
