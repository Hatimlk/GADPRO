function latin(value){return Buffer.from(String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^ -ÿ]/g,'?'),'latin1');}
function escapePdf(value){return latin(value).toString('latin1').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function clip(value,length=28){const text=String(value??'—').replace(/\s+/g,' ').trim();return text.length>length?`${text.slice(0,length-1)}…`:text;}

export function buildReportPdf({title,subtitle='',columns,rows,generatedAt=new Date()}){
  const pageSize=34;const pages=[];for(let index=0;index<Math.max(rows.length,1);index+=pageSize)pages.push(rows.slice(index,index+pageSize));
  const objects=[null,null,null];const pageRefs=[];
  for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
    const contentRef=objects.length+2,pageRef=objects.length+1;pageRefs.push(pageRef);
    const commands=['BT','/F1 18 Tf','0.08 0.2 0.42 rg',`40 555 Td (${escapePdf('GADIMAT · PROGAD')}) Tj`,'/F1 14 Tf','0 -24 Td',`(${escapePdf(title)}) Tj`,'/F1 8 Tf','0 -16 Td',`(${escapePdf(`${subtitle} · Généré le ${generatedAt.toLocaleString('fr-FR')}`)}) Tj`,'0 g','/F1 8 Tf','0 -24 Td',`(${escapePdf(columns.map(column=>clip(column.label,20)).join(' | '))}) Tj`];
    for(const row of pages[pageIndex])commands.push('0 -13 Td',`(${escapePdf(columns.map(column=>clip(row[column.key],20)).join(' | '))}) Tj`);
    commands.push('/F1 7 Tf','0 -20 Td',`(${escapePdf(`Page ${pageIndex+1}/${pages.length} · ${rows.length} ligne(s)`)}) Tj`,'ET');const content=commands.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentRef} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content,'latin1')} >>\nstream\n${content}\nendstream`);
  }
  objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]=`<< /Type /Pages /Kids [${pageRefs.map(ref=>`${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;objects[2]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  const chunks=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[0];let offset=chunks[0].length;objects.forEach((object,index)=>{offsets[index+1]=offset;const chunk=Buffer.from(`${index+1} 0 obj\n${object}\nendobj\n`,'latin1');chunks.push(chunk);offset+=chunk.length;});const xref=offset;let trailer=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let index=1;index<=objects.length;index++)trailer+=`${String(offsets[index]).padStart(10,'0')} 00000 n \n`;trailer+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;chunks.push(Buffer.from(trailer,'latin1'));return Buffer.concat(chunks);
}
