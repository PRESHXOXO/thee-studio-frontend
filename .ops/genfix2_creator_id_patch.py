from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

old = '''async function tsFastifyCreateDirectorBatch({prompt:t="",negativePrompt:r="",creatorId:n=null,batchSize:s=1,requestKey:d=null,prompts:c=null}={}){const h=Math.max(1,Math.min(5,Number(s)||1)),f=d||crypto.randomUUID(),y={id:`api-${crypto.randomUUID()}`,requestKey:f,prompt:String(t||""),negativePrompt:String(r||""),creatorId:n||null,prompts:Array.isArray(c)?c.slice(0,h):null,requestedCount:h,createdAt:new Date().toISOString(),slots:Array.from({length:h},(k,m)=>({slotIndex:m,status:"queued",attempt:0,providerState:"queued"}))};tsFastifySaveDirectorBatch(y);for(let k=0;k<h;k+=1)await tsFastifySubmitDirectorSlot(y,k);return tsFastifyDirectorBatchView(y)}'''

new = '''function tsFastifyRosterCreatorName(t){try{const r=JSON.parse((globalThis.localStorage==null?void 0:globalThis.localStorage.getItem("ts_characters"))||"[]"),n=(Array.isArray(r)?r:[]).find(s=>String((s==null?void 0:s.cloudCreatorId)||(s==null?void 0:s.id)||"")===String(t));return n!=null&&n.name?String(n.name).trim():""}catch{return""}}async function tsFastifyResolveCreatorId(t){if(!t)return null;const r=await hL("/compat/creators");if(r.error)throw new Error(`Could not verify the selected Cast member: ${r.error.message}`);const n=r.data&&Array.isArray(r.data.rows)?r.data.rows:Array.isArray(r.data)?r.data:[],s=n.find(h=>String((h==null?void 0:h.id)||"")===String(t));if(s)return s.id;const d=tsFastifyRosterCreatorName(t).toLowerCase();if(!d)throw new Error("The selected Cast member is not linked to the current Studio backend. Open Cast and save this creator once, then try again.");const c=n.filter(h=>String((h==null?void 0:h.name)||"").trim().toLowerCase()===d);if(c.length===1)return c[0].id;if(c.length>1)throw new Error("More than one backend Cast member has this name. Open Cast and save the intended creator once, then try again.");throw new Error("The selected Cast member is not linked to the current Studio backend. Open Cast and save this creator once, then try again.")}async function tsFastifyCreateDirectorBatch({prompt:t="",negativePrompt:r="",creatorId:n=null,batchSize:s=1,requestKey:d=null,prompts:c=null}={}){const h=Math.max(1,Math.min(5,Number(s)||1)),f=d||crypto.randomUUID(),k=n?await tsFastifyResolveCreatorId(n):null,y={id:`api-${crypto.randomUUID()}`,requestKey:f,prompt:String(t||""),negativePrompt:String(r||""),creatorId:k,prompts:Array.isArray(c)?c.slice(0,h):null,requestedCount:h,createdAt:new Date().toISOString(),slots:Array.from({length:h},(m,v)=>({slotIndex:v,status:"queued",attempt:0,providerState:"queued"}))};tsFastifySaveDirectorBatch(y);for(let m=0;m<h;m+=1)await tsFastifySubmitDirectorSlot(y,m);return tsFastifyDirectorBatchView(y)}'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"Expected one Fastify Director batch constructor, found {count}")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8", newline="")
