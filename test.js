// Run with: node test.js (Node is needed only for tests, not for the app).
const assert=require('node:assert/strict'),e=require('./engine.js');let checks=0;
function check(fn){fn();checks++;}
function brute(a,b,min){const ma=Array(a.length).fill(false),mb=Array(b.length).fill(false);let longest=0;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){let k=0;while(i+k<a.length&&j+k<b.length&&a[i+k]===b[j+k])k++;longest=Math.max(longest,k);if(k>=min)for(let x=0;x<k;x++){ma[i+x]=true;mb[j+x]=true;}}return {ma,mb,longest};}
const tokens=a=>a.map(value=>({value}));
let seed=3421;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
for(let n=0;n<180;n++)check(()=>{const a=Array.from({length:rand(25)},()=>rand(5));const sa=e.suffixArray(a);const expected=Array.from({length:a.length},(_,i)=>i).sort((i,j)=>{while(i<a.length&&j<a.length&&a[i]===a[j]){i++;j++;}return i===a.length?-1:j===a.length?1:a[i]-a[j];});assert.deepEqual(sa,expected);const lcp=e.kasai(a,sa);sa.forEach((p,r)=>{let k=0;if(r)while(a[p+k]!==undefined&&a[p+k]===a[sa[r-1]+k])k++;assert.equal(lcp[r],k);});});
for(let n=0;n<400;n++)check(()=>{const a=Array.from({length:rand(25)},()=>rand(5)),b=Array.from({length:rand(25)},()=>rand(5)),min=1+rand(6),actual=e.compare(tokens(a),tokens(b),min),expected=brute(a,b,min);assert.deepEqual(actual.maskA,expected.ma);assert.deepEqual(actual.maskB,expected.mb);assert.equal(actual.longest,expected.longest);assert.equal(actual.score,a.length+b.length?100*(expected.ma.filter(Boolean).length+expected.mb.filter(Boolean).length)/(a.length+b.length):0);for(const block of actual.blocks)assert.deepEqual(a.slice(block.a,block.a+block.length),b.slice(block.b,block.b+block.length));});
check(()=>assert.deepEqual(e.tokenize('x = "//literal"; // comment','a.js').map(t=>t.value),['x','=','"//literal"',';']));
check(()=>assert.deepEqual(e.tokenize('x = "#literal" # comment','a.py').map(t=>t.value),['x','=','"#literal"']));
check(()=>assert.deepEqual(e.tokenize('#include <stdio.h>','a.c').map(t=>t.value),['#','include','<','stdio','.','h','>']));
check(()=>{const source='// hi\nlet a="♥";';for(const t of e.tokenize(source,'x.js',true))assert.equal(source.slice(t.start,t.end),t.raw);});
check(()=>{const a=e.tokenize('def total(x):\n return x + 3','a.py',true),b=e.tokenize('def sum(y):\n return y + 9','b.py',true);assert.equal(e.compare(a,b,2).score,100);});
check(()=>{const r=e.analyse([{name:'a.py',text:'x=1'},{name:'b.py',text:'x=1'},{name:'c.py',text:'y=2'}],{min:2,normalise:false});assert.equal(r.pairs.length,3);assert.equal(r.pairs[0].score,100);});
check(()=>assert.equal(e.compare([],[],2).score,0));
check(()=>assert.throws(()=>e.analyse([{name:'a.py',text:'x '.repeat(8001)},{name:'b.py',text:'x=1'}],{min:5,normalise:false}),/Token limit/));
check(()=>assert.deepEqual(e.tokenize('x = 9 // 2 # note','x.py').map(t=>t.value),['x','=','9','//','2']));
console.log(`${checks} checks passed: suffix ordering, Kasai LCP, exhaustive pair coverage oracle, offsets, comments, normalisation, multi-file comparisons and limits.`);
