/* CodePrism: dependency-free lexical similarity engine. */
function createEngine() {
  const reserved = {
    python: 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case',
    js: 'await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield async of',
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool _Complex _Imaginary',
    cpp: 'alignas alignof asm bool catch class constexpr consteval constinit decltype delete dynamic_cast explicit export false friend mutable namespace new noexcept nullptr operator private protected public reinterpret_cast requires static_assert static_cast template this thread_local throw true try typeid typename using virtual wchar_t',
    java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public record return short static strictfp super switch synchronized this throw throws transient true false null try var void volatile while yield',
  };
  const pythonBuiltins = new Set('abs all any bin bool bytearray bytes callable chr classmethod complex dict divmod enumerate eval exec filter float format frozenset getattr hasattr hash hex id input int isinstance issubclass iter len list map max min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip'.split(' '));
  function language(name) {
    if (/\.py$/i.test(name)) return 'python';
    if (/\.(js|jsx|ts|tsx)$/i.test(name)) return 'js';
    if (/\.java$/i.test(name)) return 'java';
    if (/\.(cpp|cc|hpp)$/i.test(name)) return 'cpp';
    return 'c';
  }
  function tokenize(source, name, normalise=false) {
    const lang=language(name), python=lang==='python', js=lang==='js', tokens=[], identifiers=new Map();
    const keywords=new Set((reserved[lang]+(lang==='cpp'?' '+reserved.c:'')).split(' '));
    const idStart=/[\p{ID_Start}_$]/u, idPart=/[\p{ID_Continue}_$]/u;
    let i=0;
    function emit(start,end,kind='symbol') {
      const raw=source.slice(start,end);tokens.push({value:raw,start,end,raw,kind});
    }
    const operators=['>>>=','**=','//=','<<=','>>=','===','!==','>>>','...','->*','??=','&&=','||=','==','!=','<=','>=','=>','++','--','+=','-=','*=','/=','%=','&=','|=','^=','&&','||','<<','>>','**','::',':=','->','?.','??','.*',...(python?['//']:[])].sort((a,b)=>b.length-a.length);
    while(i<source.length) {
      const start=i,ch=source[i];
      if(/\s/u.test(ch)){i++;continue;}
      if((python&&ch==='#')||(!python&&source.startsWith('//',i))||(i===0&&source.startsWith('#!',i))){while(i<source.length&&source[i]!=='\n')i++;continue;}
      if(!python&&source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+2;continue;}
      // C++ raw strings may contain quotes, comments and backslashes literally.
      const rawString=!python&&!js?source.slice(i).match(/^(?:u8|u|U|L)?R"([^\s()\\]{0,16})\(/):null;
      if(rawString){const closer=')'+rawString[1]+'"',end=source.indexOf(closer,i+rawString[0].length);i=end<0?source.length:end+closer.length;emit(start,i,'string');continue;}
      const prefix=python?source.slice(i).match(/^(?:fr|rf|br|rb|r|u|b|f)(?=["'])/i):null;
      if(prefix)i+=prefix[0].length;
      const quote=source[i];
      if(quote==='"'||quote==="'"||quote==='`') {
        const triple=(python||lang==='java')&&source.startsWith(quote.repeat(3),i),delimiter=triple?quote.repeat(3):quote;
        i+=delimiter.length;
        while(i<source.length){if(source[i]==='\\'){i=Math.min(source.length,i+2);continue;}if(source.startsWith(delimiter,i)){i+=delimiter.length;break;}i++;}
        emit(start,i,quote==='`'||prefix&&/f/i.test(prefix[0])?'interpolated':'string');continue;
      }
      // JS regex literals in expression-start contexts; division stays an operator.
      const previous=tokens.at(-1)?.raw;
      if(js&&ch==='/'&&(!previous||['=','(','[','{',',',':',';','!','?','return','=>','&&','||','??'].includes(previous))) {
        let cursor=i+1,inClass=false,closed=false;
        while(cursor<source.length&&source[cursor]!=='\n') {
          const c=source[cursor++];if(c==='\\'){cursor++;continue;}if(c==='[')inClass=true;if(c===']')inClass=false;
          if(c==='/'&&!inClass){closed=true;break;}
        }
        if(closed){while(/[a-z]/i.test(source[cursor]||'')&&cursor<source.length)cursor++;i=cursor;emit(start,i,'regex');continue;}
      }
      const number=source.slice(i).match(/^(?:0[xX][\da-fA-F](?:[\da-fA-F_]*)(?:\.[\da-fA-F_]*)?(?:[pP][+-]?\d[\d_]*)?|0[bB][01][01_]*|0[oO][0-7][0-7_]*|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)(?:[uUlLfFjJnN]*)/);
      if(number){i+=number[0].length;emit(start,i,'number');continue;}
      if(idStart.test(String.fromCodePoint(source.codePointAt(i)))) {
        i+=String.fromCodePoint(source.codePointAt(i)).length;
        while(i<source.length){const c=String.fromCodePoint(source.codePointAt(i));if(!idPart.test(c))break;i+=c.length;}
        emit(start,i,'identifier');continue;
      }
      const op=operators.find(op=>source.startsWith(op,i));i+=op?op.length:1;emit(start,i);
    }
    if(normalise) {
      // Discover straightforward Python declarations in tokens, not comments/strings.
      const declared=new Set();
      if(python)tokens.forEach((t,j)=>{if(t.kind==='identifier'&&(['def','class','as'].includes(tokens[j-1]?.raw)||['=',':='].includes(tokens[j+1]?.raw)))declared.add(t.raw);});
      tokens.forEach((t,j)=>{
        if(t.kind==='identifier'&&!keywords.has(t.raw)) {
          const previous=tokens[j-1]?.raw;
          if(previous==='.'||previous==='?.'||previous==='::'||(python&&pythonBuiltins.has(t.raw)&&!declared.has(t.raw)))return;
          if(!identifiers.has(t.raw))identifiers.set(t.raw,identifiers.size);
          t.value='@ID'+identifiers.get(t.raw);
        }else if(t.kind==='number')t.value='@NUM';
        else if(t.kind==='string')t.value='@STR';
        else if(t.kind==='regex')t.value='@REGEX';
        // Preserve interpolated literals verbatim rather than discarding their code.
      });
    }
    return tokens;
  }
  function suffixArray(values) {
    const n=values.length;if(!n)return [];
    const unique=[...new Set(values)].sort((a,b)=>a-b),ranks=new Map(unique.map((v,i)=>[v,i]));
    let rank=values.map(v=>ranks.get(v)),sa=Array.from({length:n},(_,i)=>i),classes=unique.length;
    function countingSort(input,offset) {
      const counts=new Int32Array(classes+1),output=new Array(n);
      const key=p=>p+offset<n?rank[p+offset]+1:0;
      for(const p of input)counts[key(p)]++;
      for(let j=1;j<counts.length;j++)counts[j]+=counts[j-1];
      for(let j=n-1;j>=0;j--){const p=input[j];output[--counts[key(p)]]=p;}return output;
    }
    for(let k=1;k<n;k*=2) {
      sa=countingSort(countingSort(sa,k),0);
      const next=new Array(n);next[sa[0]]=0;let groups=1;
      for(let j=1;j<n;j++){const a=sa[j-1],b=sa[j];if(rank[a]!==rank[b]||(rank[a+k]??-1)!==(rank[b+k]??-1))groups++;next[b]=groups-1;}
      rank=next;classes=groups;if(groups===n)break;
    }
    return sa;
  }
  function kasai(values,sa) {
    const n=values.length,rank=new Array(n),lcp=Array(n).fill(0);sa.forEach((p,i)=>rank[p]=i);
    let h=0;for(let i=0;i<n;i++) {const r=rank[i];if(!r){h=0;continue;} const j=sa[r-1];while(i+h<n&&j+h<n&&values[i+h]===values[j+h])h++;lcp[r]=h;if(h)h--;}
    return lcp;
  }
  function compare(a,b,min=5) {
    const dict=new Map();const ids=ts=>ts.map(t=>{if(!dict.has(t.value))dict.set(t.value,dict.size+2);return dict.get(t.value);});
    const values=[...ids(a),0,...ids(b),1],sa=suffixArray(values),lcp=kasai(values,sa),cut=a.length;
    const owner=p=>p<cut?0:p>cut&&p<values.length-1?1:-1;
    const best=Array(values.length).fill(0),witness=Array(values.length).fill(-1);
    // Nearest opposite-file suffix on either side maximises the cross-file LCP.
    for(const target of [0,1]) for(const direction of [1,-1]) {
      let last=-1,common=Infinity;
      for(let r=direction===1?0:sa.length-1;r>=0&&r<sa.length;r+=direction) {
        if(last!==-1)common=Math.min(common,lcp[direction===1?r:r+1]);
        const p=sa[r],o=owner(p);
        if(o===target){last=p;common=Infinity;}
        else if(o===1-target&&last!==-1&&common>best[p]){best[p]=common;witness[p]=last;}
      }
    }
    const diffA=new Int32Array(a.length+1),diffB=new Int32Array(b.length+1),blocks=[];
    for(let p=0;p<values.length;p++)if(owner(p)>=0&&best[p]>=min){
      const o=owner(p),start=o===0?p:p-cut-1,diff=o===0?diffA:diffB;diff[start]++;diff[start+best[p]]--;
      blocks.push(o===0?{a:p,b:witness[p]-cut-1,length:best[p]}:{a:witness[p],b:start,length:best[p]});
    }
    function coverage(diff){let sum=0,count=0;const mask=[];for(let i=0;i<diff.length-1;i++){sum+=diff[i];mask.push(sum>0);if(sum>0)count++;}return {count,mask};}
    const ca=coverage(diffA),cb=coverage(diffB);
    // Remove nested evidence on the same alignment, keeping independent copies.
    blocks.sort((x,y)=>(x.a-x.b)-(y.a-y.b)||x.a-y.a||y.length-x.length);
    const compact=[];let diagonal=null,end=-1;for(const block of blocks){const d=block.a-block.b;if(d!==diagonal){diagonal=d;end=-1;}if(block.a+block.length>end){compact.push(block);end=block.a+block.length;}}
    compact.sort((x,y)=>y.length-x.length||x.a-y.a);
    const vocabulary=Array.from(dict.keys());
    return {score:a.length+b.length?100*(ca.count+cb.count)/(a.length+b.length):0,coveredA:ca.count,coveredB:cb.count,maskA:ca.mask,maskB:cb.mask,blocks:compact.slice(0,150),blockCount:compact.length,longest:Math.max(0,...best),trace:sa.slice(0,80).map((p,r)=>({rank:r,position:p,owner:owner(p),lcp:lcp[r],tokens:values.slice(p,p+7).map(id=>id<2?'⟂':vocabulary[id-2]).join(' ')})),suffixes:sa.length};
  }
  function analyse(files,options,onProgress=()=>{}) {
    if(files.length<2||files.length>12)throw Error('Select between 2 and 12 programs.');
    if(!Number.isInteger(options.min)||options.min<2||options.min>30)throw Error('Choose a minimum block length between 2 and 30.');
    const docs=files.map(f=>({...f,tokens:tokenize(f.text,f.name,options.normalise)}));
    if(docs.some(f=>f.tokens.length>8000)||docs.reduce((s,f)=>s+f.tokens.length,0)>30000)throw Error('Token limit exceeded: use at most 8,000 tokens per file and 30,000 in total.');
    const pairs=[];for(let i=0;i<docs.length;i++)for(let j=i+1;j<docs.length;j++){pairs.push({i,j,...compare(docs[i].tokens,docs[j].tokens,options.min)});onProgress(pairs.length);}
    pairs.sort((a,b)=>b.score-a.score);return {docs,pairs,options};
  }
  return {tokenize,suffixArray,kasai,compare,analyse};
}
if(typeof module!=='undefined')module.exports=createEngine();
