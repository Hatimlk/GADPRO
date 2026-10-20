import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
const allowed={
  '.pdf':['application/pdf'],
  '.jpg':['image/jpeg'],'.jpeg':['image/jpeg'],'.png':['image/png'],
  '.xlsx':['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip'],
  '.docx':['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip'],
};
export const maximumDocumentBytes=Number(process.env.LOGISTICS_MAX_FILE_BYTES||10*1024*1024);
export const logisticsStorageRoot=resolve(process.env.LOGISTICS_STORAGE_PATH||'./data/logistics-documents');

export function sanitizeDocumentName(value){return basename(String(value||'document')).replace(/[\u0000-\u001f\u007f"\\/]/g,'_').slice(0,255)||'document';}
export function validateDocumentBuffer({originalName,mimeType,buffer}){
  const extension=extname(String(originalName||'')).toLowerCase();const accepted=allowed[extension];
  if(!accepted||!accepted.includes(String(mimeType||'').toLowerCase()))return{valid:false,code:'UNSUPPORTED_FILE_TYPE',message:'Type de fichier non autorisé.'};
  if(!Buffer.isBuffer(buffer)||buffer.length===0)return{valid:false,code:'EMPTY_FILE',message:'Le fichier est vide.'};
  if(buffer.length>maximumDocumentBytes)return{valid:false,code:'FILE_TOO_LARGE',message:'Le fichier dépasse la taille autorisée.'};
  const pdf=buffer.subarray(0,5).toString()==='%PDF-';const jpeg=buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;const png=buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));const zip=buffer[0]===0x50&&buffer[1]===0x4b&&[0x03,0x05,0x07].includes(buffer[2]);
  if((extension==='.pdf'&&!pdf)||(['.jpg','.jpeg'].includes(extension)&&!jpeg)||(extension==='.png'&&!png)||(['.xlsx','.docx'].includes(extension)&&!zip))return{valid:false,code:'FILE_SIGNATURE_MISMATCH',message:'La signature du fichier ne correspond pas à son extension.'};
  if(buffer.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')))return{valid:false,code:'MALWARE_DETECTED',message:'Le fichier a été rejeté par le contrôle de sécurité.'};
  return{valid:true,extension,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};
}

export function resolveStorageKey(storageKey){const absolute=resolve(logisticsStorageRoot,String(storageKey||''));if(absolute!==logisticsStorageRoot&&!absolute.startsWith(`${logisticsStorageRoot}${sep}`))throw Object.assign(new Error('Clé de stockage invalide.'),{code:'INVALID_STORAGE_KEY'});return absolute;}

export async function storePrivateDocument(file){const validation=validateDocumentBuffer({originalName:file.originalname,mimeType:file.mimetype,buffer:file.buffer});if(!validation.valid)throw Object.assign(new Error(validation.message),{code:validation.code});const quarantine=resolve(logisticsStorageRoot,'.quarantine');await mkdir(quarantine,{recursive:true});const tempPath=resolve(quarantine,`${crypto.randomUUID()}.upload`);await writeFile(tempPath,file.buffer,{flag:'wx'});try{const mode=process.env.LOGISTICS_AV_MODE||'signature';let scanEngine='signature-check';if(mode==='clamav'){const command=process.env.LOGISTICS_CLAMAV_COMMAND;if(!command)throw Object.assign(new Error('Antivirus Logistique non configuré.'),{code:'ANTIVIRUS_UNAVAILABLE'});try{await execFileAsync(command,['--no-summary',tempPath],{windowsHide:true,timeout:60000,maxBuffer:1024*1024});scanEngine='clamav';}catch{throw Object.assign(new Error('Le fichier a été rejeté ou le contrôle antivirus a échoué.'),{code:'ANTIVIRUS_REJECTED'});}}else if(process.env.NODE_ENV==='production'&&process.env.LOGISTICS_ALLOW_SIGNATURE_ONLY!=='true')throw Object.assign(new Error('Un antivirus externe est obligatoire en production.'),{code:'ANTIVIRUS_UNAVAILABLE'});const date=new Date();const relativeKey=`${date.getUTCFullYear()}/${String(date.getUTCMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}${validation.extension}`;const destination=resolveStorageKey(relativeKey);await mkdir(resolve(destination,'..'),{recursive:true});await rename(tempPath,destination);return{storageKey:relativeKey,extension:validation.extension,sha256:validation.sha256,sizeBytes:file.buffer.length,scanStatus:'clean',scanEngine};}finally{await unlink(tempPath).catch(()=>undefined);}}

export async function deleteStoredDocument(storageKey){await unlink(resolveStorageKey(storageKey)).catch((error)=>{if(error.code!=='ENOENT')throw error;});}
