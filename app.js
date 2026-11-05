'use strict';
const $=id=>document.getElementById(id),engine=createEngine();
let files=[],report=null,current=0,worker=null,workerURL=null,busy=false,reading=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function invalidate(){report=null;$('results').hidden=true;for(const id of ['nav-report','nav-evidence','step-report','step-evidence'])$(id).hidden=true;}
const selectedFiles=()=>files.filter(f=>f.selected!==false);
function goTo(id){$(id).scrollIntoView({behavior:motion.matches?'auto':'smooth',block:'start'});}
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
function renderFiles(){
 const selected=selectedFiles().length;
 $('file-count').textContent=`${files.length} / 12 files`;$('empty').hidden=files.length>0;
 $('selection-tools').hidden=!files.length;
 $('selection-count').textContent=`${selected} selected · ${selected*(selected-1)/2} ${selected===2?'comparison':'comparisons'}`;
 $('select-all').checked=files.length>0&&selected===files.length;
 $('select-all').indeterminate=selected>0&&selected<files.length;
 $('select-all').disabled=busy||reading;
 $('file-list').innerHTML=files.map((f,i)=>`<li class="${f.selected===false?'unselected':'chosen'}"><label class="file-choice"><input type="checkbox" data-select="${i}" aria-label="Include ${esc(f.name)}" ${f.selected===false?'':'checked'} ${busy||reading?'disabled':''}><span>${esc(f.name)}</span></label><small>${(new Blob([f.text]).size/1024).toFixed(1)} KB</small><button data-remove="${i}" aria-label="Remove ${esc(f.name)}" ${busy||reading?'disabled':''}>×</button></li>`).join('');
 $('analyse').disabled=selected<2||busy||reading;
 if(!busy)$('analyse').textContent=selected>=2?`Compare ${selected} programs →`:'Select at least 2 programs';
}
function selectionChanged(){invalidate();renderFiles();const n=selectedFiles().length;status(n<2?'Select at least two programs using the checkboxes.':`${n} selected programs will be compared. Unticked files stay in your workspace.`);}
$('file-list').onchange=e=>{if(busy||reading||!e.target.matches('[data-select]'))return;const index=Number(e.target.dataset.select);files[index].selected=e.target.checked;selectionChanged();$('file-list').querySelector(`[data-select="${index}"]`).focus();};
$('select-all').onchange=e=>{if(busy||reading)return;files.forEach(f=>f.selected=e.target.checked);selectionChanged();};
function setBusy(value){busy=value;$('analyse').classList.toggle('busy',value);$('analyse').textContent=value?'Comparing your programs…':'Compare programs →';$('cancel').hidden=!value;for(const id of ['files','demo','clear','mode','minimum'])$(id).disabled=value;renderFiles();}
async function addFiles(list){if(busy||reading)return;reading=true;renderFiles();const errors=[];for(const f of list){
 if(files.length>=12){errors.push('Maximum 12 files.');break;}
 if(!/\.(py|js|ts|jsx|tsx|java|c|cpp|cc|h|hpp|cs|go|rs|txt)$/i.test(f.name)){errors.push(`${f.name}: unsupported file type.`);continue;}
 if(f.size>200*1024){errors.push(`${f.name}: exceeds 200 KB.`);continue;}
 try{const text=await f.text();if(!text.trim()){errors.push(`${f.name}: empty file.`);continue;}if(text.includes('\0')){errors.push(`${f.name}: binary files are not supported.`);continue;}
 if(files.some(x=>x.name===f.name)){errors.push(`${f.name}: already added; rename it or remove the existing file.`);continue;}files.push({name:f.name,text,selected:true});}catch{errors.push(`Could not read ${f.name}.`);}
 }reading=false;invalidate();renderFiles();status(errors.length?errors.join(' '):`${files.length} programs ready. Your files stay in this browser.`,errors.length>0);$('files').value='';}
$('files').onchange=e=>addFiles(e.target.files);
$('drop').ondragover=e=>{e.preventDefault();if(!busy)$('drop').classList.add('over');};$('drop').ondragleave=()=>$('drop').classList.remove('over');$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('over');addFiles(e.dataTransfer.files);};
$('file-list').onclick=e=>{const button=e.target.closest('[data-remove]');if(!button||busy||reading)return;files.splice(Number(button.dataset.remove),1);invalidate();renderFiles();status('Workspace updated.');};
$('clear').onclick=()=>{if(reading||busy)return;files=[];invalidate();renderFiles();status('Add at least two programs to begin.');};
$('minimum').oninput=()=>{$('min-value').textContent=`${$('minimum').value} tokens`;invalidate();status('Settings changed. Compare again to refresh results.');};$('mode').onchange=()=>{updateModeGuide();invalidate();status('Settings changed. Compare again to refresh results.');};
$('demo').onclick=()=>{if(reading||busy)return;files=[{name:'original.py',text:'def sum_even(numbers):\n    total = 0\n    for value in numbers:\n        if value % 2 == 0:\n            total += value\n    return total\n\nprint(sum_even([1, 2, 3, 4, 5, 6]))\n'},{name:'renamed.py',text:'# Same structure with different names\ndef add_even(items):\n    result = 0\n    for item in items:\n        if item % 2 == 0:\n            result += item\n    return result\n\nprint(add_even([1, 2, 3, 4, 5, 6]))\n'},{name:'different.py',text:'def reverse_word(word):\n    return word[::-1]\n\nmessage = "hello"\nprint(reverse_word(message))\n'}];$('mode').value='normalised';updateModeGuide();invalidate();renderFiles();status('Three sample programs loaded. Normalised mode reveals the renamed structure.');goTo('workspace');};
function cleanup(){if(worker)worker.terminate();if(workerURL)URL.revokeObjectURL(workerURL);worker=null;workerURL=null;}
$('cancel').onclick=()=>{cleanup();setBusy(false);status('Analysis cancelled. Your files are still ready.');};
$('analyse').onclick=()=>{
 const chosen=selectedFiles().map(({name,text})=>({name,text}));
 if(chosen.length<2||busy||reading)return;invalidate();setBusy(true);status('Tokenising files and building suffix arrays…');
 const options={normalise:$('mode').value==='normalised',min:Number($('minimum').value)},started=performance.now();
 const success=result=>{cleanup();report=result;report.elapsed=Math.round(performance.now()-started);setBusy(false);status('Comparison complete. Review the evidence below.');renderReport();goTo('results');};
 const failure=error=>{cleanup();setBusy(false);status(error.message||String(error),true);};
 try{const source=`const engine=(${createEngine.toString()})();onmessage=e=>{try{const result=engine.analyse(e.data.files,e.data.options,n=>postMessage({progress:n}));postMessage({result});}catch(error){postMessage({error:error.message});}};`;
 workerURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(workerURL);worker.onmessage=e=>{if(e.data.error)failure(Error(e.data.error));else if(e.data.result)success(e.data.result);else status(`Compared ${e.data.progress} of ${chosen.length*(chosen.length-1)/2} pairs…`);};worker.onerror=()=>failure(Error('The analysis worker could not start. Serve this folder with a local HTTP server or GitHub Pages.'));worker.postMessage({files:chosen,options});
 }catch(error){failure(error);}
};
function renderReport(){
 $('results').hidden=false;for(const id of ['nav-report','nav-evidence','step-report','step-evidence'])$(id).hidden=false;
 $('stats').innerHTML=`<div class="stat"><strong>${report.docs.length}</strong><span>Programs explored</span></div><div class="stat"><strong>${report.pairs.length}</strong><span>Pairwise comparisons</span></div><div class="stat"><strong>${report.pairs[0].score.toFixed(1)}%</strong><span>Highest similarity</span></div>`;
 $('pairs').innerHTML=report.pairs.map((p,i)=>`<tr data-pair="${i}"><td><button data-pair="${i}">${esc(report.docs[p.i].name)} ↔ ${esc(report.docs[p.j].name)}<span class="inspect-hint">Inspect shared code ↓</span></button></td><td><strong>${p.score.toFixed(1)}%</strong><div class="bar"><i style="width:${p.score}%"></i></div></td><td>${p.longest} tokens</td><td>${p.coveredA} + ${p.coveredB}</td></tr>`).join('');selectPair(0);
}
$('pairs').onclick=e=>{const row=e.target.closest('[data-pair]');if(row){selectPair(Number(row.dataset.pair));goTo('evidence');$('evidence').focus({preventScroll:true});}};
function selectPair(index){current=index;if(!motion.matches)$('evidence').animate([{opacity:.4,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});const p=report.pairs[index],a=report.docs[p.i],b=report.docs[p.j];
 document.querySelectorAll('#pairs tr').forEach((row,i)=>row.classList.toggle('selected',i===index));
 $('pair-title').textContent=`${a.name} ↔ ${b.name}`;
 $('pair-info').textContent=`${p.score.toFixed(1)}% similarity · ${p.coveredA}/${a.tokens.length} tokens in the first file and ${p.coveredB}/${b.tokens.length} in the second. ${report.options.normalise?'Normalised':'Exact'} mode · minimum ${report.options.min} tokens. Longest shared sequence: ${p.longest} tokens (may be below the minimum). ${p.blockCount>150?'Showing the 150 longest evidence blocks; score includes all matches.':''}`;
 $('blocks').innerHTML='<option value="-1">Show all shared tokens</option>'+p.blocks.map((x,i)=>`<option value="${i}">Block ${i+1} · ${x.length} tokens · lines ${line(a.text,a.tokens[x.a].start)} ↔ ${line(b.text,b.tokens[x.b].start)}</option>`).join('');
 $('blocks').disabled=!p.blocks.length;
 if(!p.blocks.length)$('blocks').innerHTML='<option value="-1">No shared block meets this threshold</option>';
 $('trace').innerHTML=p.trace.map(t=>`<tr><td>${t.rank}</td><td>${t.position}</td><td>${t.owner<0?'Separator':t.owner===0?'A':'B'}</td><td>${t.lcp}</td><td>${esc(t.tokens)}</td></tr>`).join('');renderCode();
}
function line(text,offset){return text.slice(0,offset).split('\n').length;}
function highlight(doc,mask,selectedStart,selectedLength){let html='',cursor=0;doc.tokens.forEach((t,i)=>{html+=esc(doc.text.slice(cursor,t.start));const active=selectedStart!==undefined&&i>=selectedStart&&i<selectedStart+selectedLength;html+=mask[i]?`<mark${active?' class="active"':''}>${esc(doc.text.slice(t.start,t.end))}</mark>`:esc(doc.text.slice(t.start,t.end));cursor=t.end;});return html+esc(doc.text.slice(cursor));}
function renderCode(){const p=report.pairs[current],block=p.blocks[Number($('blocks').value)];$('code-view').innerHTML=[{doc:report.docs[p.i],mask:p.maskA,start:block?.a},{doc:report.docs[p.j],mask:p.maskB,start:block?.b}].map(x=>`<div class="code-panel"><div class="code-title">${esc(x.doc.name)} · ${x.doc.tokens.length} tokens</div><pre tabindex="0"><code>${highlight(x.doc,x.mask,x.start,block?.length)}</code></pre></div>`).join('');if(block)document.querySelectorAll('#code-view pre').forEach(pre=>{const mark=pre.querySelector('.active');if(mark)pre.scrollTop+=mark.getBoundingClientRect().top-pre.getBoundingClientRect().top-60;});}
$('blocks').onchange=renderCode;
$('export').onclick=()=>{if(!report)return;const result={title:'CodePrism similarity report',createdAt:new Date().toISOString(),notice:'Similarity detection, not proof of plagiarism.',formula:'100 * (coveredA + coveredB) / (tokensA + tokensB)',options:report.options,files:report.docs.map(d=>({name:d.name,tokens:d.tokens.length})),pairs:report.pairs.map(p=>({fileA:report.docs[p.i].name,fileB:report.docs[p.j].name,similarity:p.score,coveredA:p.coveredA,coveredB:p.coveredB,longestMatch:p.longest,displayedBlocks:p.blocks.map(b=>({...b,lineA:line(report.docs[p.i].text,report.docs[p.i].tokens[b.a].start),lineB:line(report.docs[p.j].text,report.docs[p.j].tokens[b.b].start)})),blockCount:p.blockCount}))};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='codeprism-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

function updateModeGuide(){const normal=$('mode').value==='normalised';$('mode-title').textContent=normal?'Same structure, different variable names?':'Same code, different formatting?';$('mode-summary').textContent=normal?'Use Normalised. Consistent variable renaming and changed literal values can match. Keywords, operators and member names remain meaningful.':'Use Exact. Comments and spaces are ignored; names, values and operators must match.';}
updateModeGuide();renderFiles();
// Motion supports navigation rather than hiding content or delaying interaction.
const reveals=document.querySelectorAll('.hero,.notice,.workspace-grid,.method-grid,.explain');
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){if(!motion.matches)entry.target.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,easing:'cubic-bezier(.2,.65,.3,1)'});observer.unobserve(entry.target);}},{threshold:.1});reveals.forEach(el=>observer.observe(el));}
const art=document.querySelector('.art');
art.addEventListener('pointermove',event=>{if(motion.matches||event.pointerType!=='mouse')return;const rect=art.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;art.querySelector('img').style.transform=`perspective(900px) rotateX(${-y*6}deg) rotateY(${x*6}deg)`;});
art.addEventListener('pointerleave',()=>art.querySelector('img').style.transform='');
if('IntersectionObserver' in window){const navObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.journey a').forEach(a=>{const active=a.hash==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});}},{rootMargin:'-10% 0px -60% 0px'});['workspace','results','evidence'].forEach(id=>navObserver.observe($(id)));}
