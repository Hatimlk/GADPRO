import { describe,expect,it } from 'vitest';
import { normalizeImportRow,validateNormalizedImportRow } from '../src/domains/logistique/services/imports.js';
import { extendedImportBusinessKey,resolveExtendedImportRow } from '../src/domains/logistique/services/importExtensions.js';

describe('imports complémentaires Logistique',()=>{
  it('normalise et valide un conducteur avec ses catégories de permis',()=>{
    const{normalized}=normalizeImportRow('drivers',{Matricule:'C-1',Nom:'Ali Test',Permis:'B; C; B'},{employeeIdentifier:'Matricule',fullName:'Nom',licenseCategories:'Permis'});
    expect(normalized).toMatchObject({employeeIdentifier:'C-1',fullName:'Ali Test',employeeStatus:'active',licenseCategories:['b','c']});
    expect(validateNormalizedImportRow('drivers',normalized)).toEqual([]);
  });
  it('refuse un contrat prestataire dont les dates sont inversées',()=>{
    const{normalized}=normalizeImportRow('providers',{Code:'F-1',Nom:'Garage',Debut:'2026-12-01',Fin:'2026-01-01'},{supplierCode:'Code',companyName:'Nom',contractStartsAt:'Debut',contractEndsAt:'Fin'});
    expect(validateNormalizedImportRow('providers',normalized)).toContain('La fin du contrat précède son début.');
  });
  it('valide un historique de maintenance complet',()=>{
    const{normalized}=normalizeImportRow('maintenance_history',{Ref:'H-1',Parc:'V-1',Categorie:'mechanical',Description:'Réparation historique',Date:'2025-01-10',Statut:'closed',Cout:'1250,50'},{reference:'Ref',fleetNumber:'Parc',category:'Categorie',issueDescription:'Description',reportedAt:'Date',status:'Statut',actualCost:'Cout'});
    expect(normalized.actualCost).toBe(1250.5);expect(validateNormalizedImportRow('maintenance_history',normalized)).toEqual([]);expect(extendedImportBusinessKey('maintenance_history',normalized)).toBe('h-1');
  });
  it('résout les spécialités et signale un code inconnu',()=>{
    const refs={duplicates:new Map(),names:new Map(),specialties:new Map([['mechanics',{id:'s1'}]])};
    const result=resolveExtendedImportRow('providers',{supplierCode:'F-1',companyName:'Garage',specialtyCodes:['mechanics','unknown']},refs,{});
    expect(result.resolved.specialtyIds).toEqual(['s1']);expect(result.errors[0]).toContain('unknown');
  });
  it('bloque un historique portant sur un actif hors périmètre',()=>{
    const refs={assets:new Map([['v-1',{id:'a1',site_id:'s1',department_id:null}]]),providers:new Map(),duplicates:new Map()};
    const req={moduleAccess:{permissions:[],data_scope:{allSites:false,siteIds:['s2']}}};
    expect(resolveExtendedImportRow('maintenance_history',{fleetNumber:'V-1',providerCode:null,reference:'H-1'},refs,req).errors).toContain('Actif hors de votre périmètre.');
  });
});
