from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

if 'tsFastifyHydrateCreatorRoster' in text:
    raise SystemExit('Roster hydration helper already present')

marker = 'async function JT(t,r){'
if text.count(marker) != 1:
    raise SystemExit(f'Expected one cloud bootstrap marker, found {text.count(marker)}')

helper = '''function tsFastifyCreatorReferenceUrl(t){if(!t)return null;const r=t.signed_url||t.signedUrl||t.url||t.preview_url||t.previewUrl||t.download_url||t.downloadUrl;if(r)return r;const n=t.storage_path||t.storagePath;if(!n)return null;return`/api/assets/download/creator-references/${String(n).split("/").map(encodeURIComponent).join("/")}`}function tsFastifyCreatorReferenceAsset(t){return{id:t.id,referenceType:t.reference_type||t.referenceType,storagePath:t.storage_path||t.storagePath,originalFilename:t.original_filename||t.originalFilename,mimeType:t.mime_type||t.mimeType,sizeBytes:t.size_bytes||t.sizeBytes,width:t.width,height:t.height}}async function tsFastifyHydrateCreatorRoster(){const t=await hL("/creators");if(t.error)throw t.error;const r=t.data&&Array.isArray(t.data.creators)?t.data.creators:Array.isArray(t.data)?t.data:[];let n=[];try{const e=localStorage.getItem("ts_characters");n=e?JSON.parse(e):[]}catch{}Array.isArray(n)||(n=[]);const s=[],d=new Set;for(const e of r){if(!(e!=null&&e.id))continue;const o=n.find(a=>String((a==null?void 0:a.cloudCreatorId)||(a==null?void 0:a.id)||"")===String(e.id))||null,l=await hL(`/creators/${e.id}/references`);if(l.error)continue;const u=l.data&&Array.isArray(l.data.references)?l.data.references:Array.isArray(l.data)?l.data:[],p=u.find(a=>a.reference_type==="headshot"&&a.is_canonical)||u.find(a=>a.reference_type==="headshot"),g=u.find(a=>a.reference_type==="full_body"&&a.is_canonical)||u.find(a=>a.reference_type==="full_body"),x=u.filter(a=>a.reference_type==="additional"),q=[p,...x,g,...u].filter(Boolean),w=[],z=new Set;for(const a of q){const j=a.id||a.storage_path||a.storagePath;if(j&&z.has(j))continue;j&&z.add(j);const A=tsFastifyCreatorReferenceUrl(a);A&&w.push(A)}if(!p&&!o)continue;const b=e.metadata||e.profile_data||{},C=b.coreIdentity||{},L=b.hairIdentity||{},S=b.bodyIdentity||{},I=b.brandProfile||{},H=(o==null?void 0:o.fields)||{};s.push({...o||{},id:e.id,cloudCreatorId:e.id,cloudProfile:!0,name:e.name||(o==null?void 0:o.name)||"Creator",refImages:w.length?w:(o==null?void 0:o.refImages)||[],image:w[0]||(o==null?void 0:o.image)||null,referenceAssets:q.map(tsFastifyCreatorReferenceAsset),locked:!!(p&&g)||((o==null?void 0:o.locked)===!0),fields:{...H,tone:H.tone||(C.skinTone&&C.skinTone!=="Unspecified"?C.skinTone:""),hair:H.hair||(L.style&&L.style!=="Unspecified"?L.style:""),face:H.face||(C.eyeShape&&C.eyeShape!=="Unspecified"?C.eyeShape:""),body:H.body||(S.overallBuild&&S.overallBuild!=="Unspecified"?S.overallBuild:""),wardrobe:H.wardrobe||(I.signatureClothing&&I.signatureClothing!=="Unspecified"?I.signatureClothing:""),personality:H.personality||(Array.isArray(I.energies)?I.energies.join(", "):""),niche:H.niche||(Array.isArray(I.worlds)?I.worlds.join(", "):"")}}),d.add(String(e.id))}const c=n.filter(e=>{const o=(e==null?void 0:e.cloudCreatorId)||(e==null?void 0:e.id)||null;return!(typeof o==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o))&&!d.has(String(o))}),h=[...s,...c],f=JSON.stringify(h);localStorage.setItem("ts_characters",f);return h}'''

text = text.replace(marker, helper + marker, 1)

old_tail = 'h!=null&&queueMicrotask(()=>void ER("ts_characters",h,Re).catch(()=>{})),await WB(t,r,n),queueMicrotask(()=>void GB(t,r,n))}'
new_tail = 'h!=null&&queueMicrotask(()=>void ER("ts_characters",h,Re).catch(()=>{})),t&&t.__api&&await tsFastifyHydrateCreatorRoster(),await WB(t,r,n),queueMicrotask(()=>void GB(t,r,n))}'
if text.count(old_tail) != 1:
    raise SystemExit(f'Expected one bootstrap tail, found {text.count(old_tail)}')
text = text.replace(old_tail, new_tail, 1)

with path.open('w', encoding='utf-8', newline='') as handle:
    handle.write(text)
