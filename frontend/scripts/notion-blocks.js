const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const palette={gray:"#787774",brown:"#98664a",orange:"#bc641c",yellow:"#946d0b",green:"#357958",blue:"#2673a1",purple:"#80599a",pink:"#a54478",red:"#b84640"};
function color(value="default"){
  const [name,bg]=value.split("_");if(!Object.hasOwn(palette,name))return "";
  return bg ? ' style="background:color-mix(in srgb,'+palette[name]+' 14%,transparent)"' : ' style="color:'+palette[name]+'"';
}
const safe=url=>/^(https?:\/\/|mailto:|#|\.\.\/content\/assets\/)/i.test(url||"")?esc(url):"";
function runs(items=[]){
 return items.map(r=>{
   const a=r.annotations||{};
   let h=r.type==="equation" ? '<span data-tex="inline">'+esc(r.equation.expression)+'</span>' : esc(r.plain_text??r.text?.content).replaceAll("\n","<br>");
   for(const [key,tag] of [["code","code"],["bold","strong"],["italic","em"],["underline","u"],["strikethrough","s"]])if(a[key])h='<'+tag+'>'+h+'</'+tag+'>';
   if(color(a.color))h='<span'+color(a.color)+'>'+h+'</span>';
   return safe(r.href)?'<a href="'+safe(r.href)+'">'+h+'</a>':h;
 }).join("");
}
export function nativeHtml(rows){
 let out="",list="";
 // 列表仅在同一父块中合并，子列表、示例与说明保留原来的父子关系。
 for(const b of rows){
  const t=b.type,v=b[t]||{},h=runs(v.rich_text),kids=b.children||[],tag=t==="bulleted_list_item"?"ul":t==="numbered_list_item"?"ol":"";
  if(tag!==list){if(list)out+="</"+list+">";if(tag)out+="<"+tag+">";list=tag;}
  const sub=t==="table"?"":nativeHtml(kids),attrs=color(v.color);
  if(tag)out+="<li"+attrs+">"+h+sub+"</li>";
  else if(/^heading_[1-4]$/.test(t)){let n=t.at(-1);out+="<h"+n+attrs+">"+h+"</h"+n+">"+sub;}
  else if(t==="paragraph")out+="<p"+attrs+">"+(h||"<br>")+"</p>"+sub;
  else if(t==="quote"||t==="callout"){let el=t==="quote"?"blockquote":"aside";out+="<"+el+attrs+">"+esc(v.icon?.emoji)+h+sub+"</"+el+">";}
  else if(t==="toggle")out+="<details><summary>"+h+"</summary>"+sub+"</details>";
  else if(t==="code"){const code=esc(v.rich_text.map(r=>r.plain_text).join(""));out+=v.language==="mermaid"?'<pre class="mermaid">'+code+'</pre>':'<pre><code class="language-'+esc(v.language)+'">'+code+'</code></pre>';}
  else if(t==="equation")out+='<div class="math-block" data-tex="display">'+esc(v.expression)+'</div>';
  else if(t==="divider")out+="<hr>";
  else if(t==="image"){let u=safe(b.previewSrc),w=Number(b.previewWidth),cap=runs(v.caption);if(!u)throw Error("图片缺少可发布地址："+b.id);out+='<figure'+(w>0?' data-notion-width="'+w+'"':'')+'><a href="'+u+'" target="_blank" rel="noopener"><img loading="lazy" decoding="async" src="'+u+'" alt="'+esc((v.caption||[]).map(r=>r.plain_text).join(""))+'"></a>'+(cap?'<figcaption>'+cap+'</figcaption>':'')+'</figure>';}
  else if(t==="table")out+='<div class="note-table"><table>'+kids.map((r,i)=>'<tr>'+r.table_row.cells.map((c,j)=>{let scope=i===0&&v.has_column_header?"col":j===0&&v.has_row_header?"row":"";return scope?'<th scope="'+scope+'">'+runs(c)+'</th>':'<td>'+runs(c)+'</td>';}).join("")+'</tr>').join("")+'</table></div>';
  else if(t==="bookmark")out+='<a href="'+safe(v.url)+'">'+esc(v.url)+'</a>';
  else out+=h+sub;
 }
 return out+(list?"</"+list+">":"");
}
