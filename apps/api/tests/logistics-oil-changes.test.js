import { describe,expect,it } from 'vitest';
import { nextOilChangeMileage,oilChangeStatus } from '../src/domains/logistique/services/oilChanges.js';

describe('suivi des vidanges',()=>{
  it('classe une échéance selon le seuil de 2 000 km',()=>{
    expect(oilChangeStatus({currentMileage:98000,nextServiceMileage:100000})).toBe('planned');
    expect(oilChangeStatus({currentMileage:98001,nextServiceMileage:100000})).toBe('planned');
    expect(oilChangeStatus({currentMileage:100000,nextServiceMileage:100000})).toBe('urgent');
    expect(oilChangeStatus({currentMileage:90000,nextServiceMileage:100000})).toBe('ok');
  });
  it('respecte un arrêt manuel et recalcule la prochaine échéance',()=>{
    expect(oilChangeStatus({currentMileage:1,nextServiceMileage:100000,manualStatus:'accident'})).toBe('out_of_service');
    expect(nextOilChangeMileage(120000,30000)).toBe(150000);
  });
});
