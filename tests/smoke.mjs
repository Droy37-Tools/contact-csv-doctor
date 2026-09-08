import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const file=process.argv[2]||new URL('../lite/index.html',import.meta.url);
const html=fs.readFileSync(file,'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert(script,'embedded script not found');

const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{id,value:id==='duplicates'?'merge':id==='format'?'generic':'',textContent:'',innerHTML:'',className:'',disabled:false,classList:{add(){},remove(){}},addEventListener(){},click(){}});return elements.get(id)};
const context=vm.createContext({
  console,URLSearchParams,Blob,setTimeout,
  URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  location:{search:''},navigator:{language:'en'},
  document:{documentElement:{lang:'en'},title:'',getElementById:element,querySelectorAll(){return []},querySelector(){return element('query')},createElement(){return element('created')}},
  FileReader:class{}
});
vm.runInContext(script,context);
const run=code=>vm.runInContext(code,context);

assert.equal(run("detectDelimiter('a;b\\n1;2')"),';');
assert.deepEqual(Array.from(run("parseCSV('name,email\\n\"Doe, Jane\",JANE@EXAMPLE.COM').rows[0]")),['Doe, Jane','JANE@EXAMPLE.COM']);
assert.equal(run("parseCSV('name,notes\\nJane,\"line 1\\nline 2\"').rows[0][1]"),'line 1\nline 2');
assert.equal(run("canon(parseCSV('姓名,邮箱,手机号\\n张三, USER@EXAMPLE.CN ,+86 (138) 0013-8000'))[0].email"),'user@example.cn');
assert.equal(run("canon(parseCSV('姓名,邮箱,手机号\\n张三, USER@EXAMPLE.CN ,+86 (138) 0013-8000'))[0].phone"),'+8613800138000');
assert.deepEqual(Array.from(run("{const r=clean([{first:'A',email:'a@x.com',phone:'',company:''},{first:'A',email:'a@x.com',phone:'123',company:'Acme'}]);[r.rows.length,r.duplicates,r.rows[0].phone,r.rows[0].company]}")),[1,1,'123','Acme']);
assert.deepEqual(Array.from(run("{const base={first:'',last:'',full:'',company:'',title:'',address:'',notes:''};const r=clean([{...base,email:'a@x.com',phone:'111'},{...base,email:'b@x.com',phone:'222'},{...base,email:'a@x.com',phone:'222'}]);[r.rows.length,r.duplicates]}")),[1,2]);
assert.equal(run("quote('a,\"b\"')"),'"a,""b"""');
assert.equal(run("escapeHTML('<img onerror=1>')"),'&lt;img onerror=1&gt;');
assert.throws(()=>run("parseCSV('only one column\\nvalue')"));
run("$('sample').onclick()");
assert.equal(element('rows').textContent,3);
assert.equal(element('dupes').textContent,1);
assert.equal(element('download').disabled,false);
assert.match(element('preview').innerHTML,/<table>/);

if(html.includes("const EDITION='PRO'")){
  assert.equal(run('applyEditionLimit(Array.from({length:12})).length'),12);
  assert.match(run("buildVCard([{first:'A',last:'B',full:'A B',email:'a@x.com',phone:'123',company:'',title:'',address:'',notes:'hello;world'}])"),/NOTE:hello\\;world/);
}else{
  assert.equal(run('applyEditionLimit(Array.from({length:12})).length'),10);
  assert(!/google:\[|outlook:\[|vcard:\[/.test(html),'Lite contains Pro export formats');
}

console.log(`Smoke checks passed: ${file}`);
