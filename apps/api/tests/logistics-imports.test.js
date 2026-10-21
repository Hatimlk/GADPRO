import { describe,expect,it } from 'vitest';
import * as XLSX from 'xlsx';
import { importFileHash,importMappingHash,normalizeImportRow,normalizeImportHeader,parseImportFile,suggestImportMapping,validateImportMapping,validateNormalizedImportRow } from '../src/domains/logistique/services/imports.js';

const file=(name,buffer)=>({originalname:name,buffer,mimetype:name.endsWith('.csv')?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

describe('imports guidés Logistique',()=>{
  it('propose un mapping malgré les accents et variantes de casse',()=>{
    const headers=['Numéro Parc','CATÉGORIE','Marque','Modèle','Site'];
    expect(suggestImportMapping('assets',headers)).toMatchObject({fleetNumber:'Numéro Parc',categoryCode:'CATÉGORIE',brand:'Marque',model:'Modèle',siteCode:'Site'});
    expect(normalizeImportHeader('  Référence / SKU ')).toBe('reference sku');
  });
  it('signale les colonnes obligatoires non associées',()=>{
    expect(validateImportMapping('assets',['Marque'],{brand:'Marque'})).toContain('Colonne obligatoire non associée : N° parc.');
  });
  it('normalise les nombres français et valide une pièce',()=>{
    const{normalized}=normalizeImportRow('spare_parts',{'Référence':'P-1','Nom':'Filtre','Minimum':'2,5'},{sku:'Référence',name:'Nom',minimumQuantity:'Minimum'});
    expect(normalized).toMatchObject({sku:'P-1',name:'Filtre',minimumQuantity:2.5,unit:'piece',status:'active'});
    expect(validateNormalizedImportRow('spare_parts',normalized)).toEqual([]);
  });
  it('rejette les préfixes de formule',()=>{
    expect(normalizeImportRow('spare_parts',{SKU:'=CMD()',Nom:'Filtre'},{sku:'SKU',name:'Nom'}).unsafeFields).toEqual(['sku']);
  });
  it('analyse un CSV sans écrire de donnée métier',()=>{
    const parsed=parseImportFile(file('pieces.csv',Buffer.from('SKU,Designation\nP-1,Filtre\nP-2,Courroie')));
    expect(parsed.headers).toEqual(['SKU','Designation']);expect(parsed.rows).toHaveLength(2);expect(parsed.rows[0].rowNumber).toBe(2);
  });
  it('repère aussi une cellule dangereuse dans une colonne non associée',()=>{
    const parsed=parseImportFile(file('pieces.csv',Buffer.from('SKU,Designation,Libre\nP-1,Filtre,@commande')));expect(parsed.rows[0].hasUnsafeCell).toBe(true);
  });
  it('détecte une formule dans un classeur XLSX',()=>{
    const workbook=XLSX.utils.book_new();const sheet=XLSX.utils.aoa_to_sheet([['SKU','Designation'],['P-1','Filtre']]);sheet.B2.f='1+1';XLSX.utils.book_append_sheet(workbook,sheet,'Import');const parsed=parseImportFile(file('pieces.xlsx',XLSX.write(workbook,{type:'buffer',bookType:'xlsx'})));expect(parsed.rows[0].hasFormula).toBe(true);
  });
  it('produit des empreintes déterministes',()=>{
    expect(importMappingHash({b:'B',a:'A'})).toBe(importMappingHash({a:'A',b:'B'}));expect(importFileHash(Buffer.from('a'))).not.toBe(importFileHash(Buffer.from('b')));
  });
  it('refuse une extension non autorisée',()=>expect(()=>parseImportFile(file('data.xls',Buffer.from('x')))).toThrow('CSV et XLSX'));
});
