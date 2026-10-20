export type ReferenceItem = { id: string; code: string; name: string };
export type ReferenceData = { sites: ReferenceItem[]; departments: ReferenceItem[]; assetCategories: (ReferenceItem & { meter_type: string; requires_registration: boolean })[] };
export type Asset = {
  id: string; fleet_number: string; registration_number: string | null; category_id: string; category_name: string;
  brand: string; model: string; serial_number: string | null; vin: string | null; manufacture_year: number | null;
  acquisition_date: string | null; purchase_cost: string | null; site_id: string; site_code: string; department_id: string | null;
  current_mileage: string; current_operating_hours: string; fuel_type: string | null; status: string; notes: string | null;
  version: number; primary_driver_name?: string | null;
};
export type Driver = {
  id: string; employee_identifier: string; full_name: string; employee_status: string; professional_phone: string | null;
  professional_email: string | null; license_expiry_date: string | null; notes: string | null; active_assignments?: number; version: number;
};
export type Page<T> = { data: T[]; page: number; limit: number; total: number; totalPages: number };
export type Provider = { id:string;supplier_code:string;company_name:string;contact_name:string|null;phone:string|null;email:string|null;address:string|null;status:string;version:number;specialties:Array<{id:string;code:string;name:string}> };
export type Intervention = { id:string;reference:string;asset_id:string;fleet_number:string;registration_number:string|null;brand:string;model:string;site_id:string;provider_id:string|null;provider_name:string|null;maintenance_kind:string;category:string;issue_description:string;priority:string;requester_user_id:string;status:string;reported_at:string;planned_start_at:string|null;actual_start_at:string|null;actual_end_at:string|null;estimated_cost:string|null;actual_cost:string|null;downtime_hours:string|null;version:number };
export type MaintenanceTrigger = { id?:string;triggerType:'mileage'|'hours'|'calendar';intervalValue:string|number;intervalUnit:'km'|'hours'|'days'|'months'|'years';warningThreshold:string|number };
export type MaintenancePlan = { id:string;code:string;operation_name:string;description:string|null;category_name:string|null;estimated_duration_hours:string|null;estimated_cost:string|null;status:string;version:number;asset_count:number;triggers:MaintenanceTrigger[] };
export type MaintenanceDue = { id:string;plan_code:string;operation_name:string;asset_id:string;fleet_number:string;brand:string;model:string;status:string;due_date:string|null;due_mileage:string|null;due_hours:string|null;current_mileage:string;current_operating_hours:string;estimated_cost:string|null;intervention_id:string|null };
export type LogisticsAlert = { id:string;alert_type:string;severity:string;title:string;message:string;status:string;fleet_number:string;brand:string;model:string;due_date:string|null;due_mileage:string|null;due_hours:string|null;version:number;created_at:string };
