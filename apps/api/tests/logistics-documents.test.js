import { describe,expect,it } from 'vitest';
import { resolveStorageKey, sanitizeDocumentName, validateDocumentBuffer } from '../src/domains/logistique/services/documents.js';
import { scopeAllows } from '../src/domains/logistique/services/notifications.js';

describe('sécurité documentaire Logistique',()=>{
  it('accepte un PDF dont la signature correspond',()=>expect(validateDocumentBuffer({originalName:'carte-grise.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\ncontenu')})).toMatchObject({valid:true,extension:'.pdf'}));
  it('refuse une extension ou une signature déguisée',()=>{expect(validateDocumentBuffer({originalName:'preuve.exe',mimeType:'application/octet-stream',buffer:Buffer.from('MZ')})).toMatchObject({valid:false,code:'UNSUPPORTED_FILE_TYPE'});expect(validateDocumentBuffer({originalName:'preuve.pdf',mimeType:'application/pdf',buffer:Buffer.from('pas un pdf')})).toMatchObject({valid:false,code:'FILE_SIGNATURE_MISMATCH'});});
  it('rejette la signature de test antivirus',()=>expect(validateDocumentBuffer({originalName:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-EICAR-STANDARD-ANTIVIRUS-TEST-FILE')})).toMatchObject({valid:false,code:'MALWARE_DETECTED'}));
  it('nettoie le nom présenté au téléchargement',()=>expect(sanitizeDocumentName('../facture\u0000".pdf')).toBe('facture__.pdf'));
  it('bloque une clé qui sort du stockage privé',()=>expect(()=>resolveStorageKey('../../secret.txt')).toThrow('Clé de stockage invalide.'));
});

describe('périmètre des notifications',()=>{
  it('filtre par site et service',()=>{const scope={allSites:false,siteIds:['site-a'],departmentIds:['dep-a']};expect(scopeAllows(scope,'site-a','dep-a')).toBe(true);expect(scopeAllows(scope,'site-b','dep-a')).toBe(false);expect(scopeAllows(scope,'site-a','dep-b')).toBe(false);});
  it('accepte le périmètre global',()=>expect(scopeAllows({allSites:true},'site-x',null)).toBe(true));
});
