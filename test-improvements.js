// Run: node test-improvements.js
const assert=require('node:assert/strict'),e=require('./engine.js');let checks=0;
const test=fn=>{fn();checks++;},values=(s,n='test.py',normal=false)=>e.tokenize(s,n,normal).map(t=>t.value);
const cases=[
 ['x=9//2 # comment','test.py',['x','=','9','//','2']],
 ['x//=2','test.py',['x','//=','2']],
 ['x=0xFF+1_000+2e-3+0b10','test.py',['x','=','0xFF','+','1_000','+','2e-3','+','0b10']],
 ['π = café + 2','test.py',['π','=','café','+','2']],
 ['text = r"# not a comment" # comment','test.py',['text','=','r"# not a comment"']],
 ['text = """a\n# comment-like text\n"""','test.py',['text','=','"""a\n# comment-like text\n"""']],
 ['auto s=R"tag(// text " quote)tag";','a.cpp',['auto','s','=','R"tag(// text " quote)tag"',';']],
 [String.raw`const r=/https?:\/\/[^ ]+/gi;`,'a.js',['const','r','=',String.raw`/https?:\/\/[^ ]+/gi`,';']],
 ['let n=a/b/2;','a.js',['let','n','=','a','/','b','/','2',';']],
 ['const x=a?.b??0;','a.js',['const','x','=','a','?.','b','??','0',';']],
 ['#include <stdio.h> // comment','a.c',['#','include','<','stdio','.','h','>']],
 [String.raw`x="escaped \" quote"; y=2`,'a.js',['x','=',String.raw`"escaped \" quote"`,';','y','=','2']],
];
for(const [source,name,expected] of cases)test(()=>assert.deepEqual(values(source,name),expected));
test(()=>assert.deepEqual(values('def tally(items):\n result=items+3\n return result','a.py',true),values('def calculate(data):\n answer=data+9\n return answer','b.py',true)));
test(()=>assert.notDeepEqual(values('answer=x+x','a.py',true),values('result=y+z','b.py',true)));
test(()=>assert.notDeepEqual(values('items.append(value)','a.py',true),values('data.remove(item)','b.py',true)));
test(()=>assert.notDeepEqual(values('out=sorted(items)','a.py',true),values('result=reversed(data)','b.py',true)));
test(()=>assert.deepEqual(values('def total(x): return x+1','a.py',true),values('def sum(y): return y+9','b.py',true)));
test(()=>assert.notDeepEqual(values('s=f"{x+x}"','a.py',true),values('s=f"{x-x}"','b.py',true)));
test(()=>assert.notDeepEqual(values('s=`${x+x}`','a.js',true),values('s=`${x-x}`','b.js',true)));
for(const [source,name] of cases)test(()=>{for(const normal of [false,true]){let end=0;for(const t of e.tokenize(source,name,normal)){assert.ok(t.start>=end);assert.equal(source.slice(t.start,t.end),t.raw);end=t.end;}}});
for(let i=0;i<100;i++)test(()=>{const a=`def compute_${i}(data_${i}):\n total_${i}=0\n for item_${i} in data_${i}:\n  total_${i}+=item_${i}\n return total_${i}`,b=`# changed formatting\ndef run_${i}(values_${i}):\n acc_${i} = 99\n for element_${i} in values_${i}:\n  acc_${i} += element_${i}\n return acc_${i}\n`;assert.equal(e.compare(e.tokenize(a,'a.py',true),e.tokenize(b,'b.py',true),5).score,100);});
test(()=>{const t=a=>a.map(value=>({value})),a=t([2,3,4]),b=t([2,3,4,8,2,3,4]),r=e.compare(a,b,3);assert.equal(r.coveredA,3);assert.equal(r.coveredB,6);assert.ok(r.blocks.some(x=>x.b===0));assert.ok(r.blocks.some(x=>x.b===4));});
for(const min of [0,-1,1,31,NaN,2.5])test(()=>assert.throws(()=>e.analyse([{name:'a.py',text:'x=1'},{name:'b.py',text:'x=1'}],{min,normalise:false}),/minimum/));
test(()=>assert.throws(()=>e.analyse([],{min:5}),/Select/));
test(()=>assert.throws(()=>e.analyse(Array(13).fill({name:'a.py',text:'x=1'}),{min:5}),/Select/));
console.log(`${checks} improvement checks passed: lexical edge cases, consistent renaming, false-match controls, source offsets, repeated evidence and validation.`);
