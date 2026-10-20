import { describe,expect,it } from 'vitest';
import { maintenancePlanCreateSchema } from '../src/domains/logistique/schemas/validation.js';
import { calculatePreventiveDue } from '../src/domains/logistique/services/preventive.js';

const base={
  planAsset:{activated_at:'2026-01-31',last_completed_at:null,last_completed_mileage:10000,last_completed_hours:500},
  asset:{current_mileage:14000,current_operating_hours:550},today:'2026-02-20',
};

describe('calcul des échéances préventives',()=>{
  it('calcule un cycle kilométrique depuis le compteur d’activation',()=>{
    expect(calculatePreventiveDue({...base,triggers:[{trigger_type:'mileage',interval_value:5000,warning_threshold:1000}]})).toMatchObject({status:'due',dueMileage:15000,cycleKey:'2026-01-31|-|15000|-'});
  });
  it('déclare le cycle en retard lorsque le compteur dépasse la cible',()=>{
    expect(calculatePreventiveDue({...base,asset:{...base.asset,current_operating_hours:710},triggers:[{trigger_type:'hours',interval_value:200,warning_threshold:20}]})).toMatchObject({status:'overdue',dueHours:700});
  });
  it('borne correctement une échéance mensuelle en fin de mois',()=>{
    expect(calculatePreventiveDue({...base,triggers:[{trigger_type:'calendar',interval_value:1,interval_unit:'months',warning_threshold:10}]})).toMatchObject({status:'due',dueDate:'2026-02-28'});
  });
  it('applique la règle du premier seuil atteint avec plusieurs déclencheurs',()=>{
    const result=calculatePreventiveDue({...base,triggers:[
      {trigger_type:'mileage',interval_value:10000,warning_threshold:500},
      {trigger_type:'hours',interval_value:40,warning_threshold:5},
    ]});expect(result.status).toBe('overdue');
  });
});

describe('validation des plans préventifs',()=>{
  const plan={code:'VID-10K',operationName:'Vidange 10 000 km',assetIds:['11111111-1111-4111-8111-111111111111']};
  it('accepte un déclencheur cohérent',()=>expect(maintenancePlanCreateSchema.safeParse({...plan,triggers:[{triggerType:'mileage',intervalValue:10000,intervalUnit:'km',warningThreshold:1000}]}).success).toBe(true));
  it('refuse une unité incompatible',()=>expect(maintenancePlanCreateSchema.safeParse({...plan,triggers:[{triggerType:'mileage',intervalValue:10000,intervalUnit:'months'}]}).success).toBe(false));
  it('refuse deux déclencheurs du même type',()=>expect(maintenancePlanCreateSchema.safeParse({...plan,triggers:[{triggerType:'hours',intervalValue:100,intervalUnit:'hours'},{triggerType:'hours',intervalValue:200,intervalUnit:'hours'}]}).success).toBe(false));
  it('exige un intervalle calendrier entier',()=>expect(maintenancePlanCreateSchema.safeParse({...plan,triggers:[{triggerType:'calendar',intervalValue:1.5,intervalUnit:'months'}]}).success).toBe(false));
});
