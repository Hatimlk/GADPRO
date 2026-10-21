import pg from 'pg';

const confirmation = process.env.LOGISTICS_DEMO_SEED_TARGET;
const webOrigin = new URL(process.env.WEB_ORIGIN || 'http://localhost:3000');
const logisticsUrl = new URL(process.env.LOGISTICS_DATABASE_URL || '');

if (confirmation !== 'preprod.gadimat.pro' || webOrigin.hostname !== confirmation) {
  throw new Error('Seed refusé : définir LOGISTICS_DEMO_SEED_TARGET=preprod.gadimat.pro sur la préproduction.');
}
if (logisticsUrl.pathname.replace(/^\//, '') !== 'gadimat_logistique') {
  throw new Error('Seed refusé : la base cible doit être gadimat_logistique.');
}

const central = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL });
const logistics = new pg.Pool({ connectionString: process.env.LOGISTICS_DATABASE_URL });
const client = await logistics.connect();

try {
  const actorResult = await central.query(`
    SELECT u.id
    FROM users u
    JOIN module_access ma ON ma.user_id=u.id
    WHERE u.active=true AND ma.active=true AND ma.module_code='logistique'
    ORDER BY u.platform_admin DESC,u.created_at
    LIMIT 1
  `);
  const actorId = actorResult.rows[0]?.id;
  if (!actorId) throw new Error('Aucun utilisateur central actif avec accès Logistique.');

  const schemaResult = await client.query("SELECT 1 FROM schema_migrations WHERE version='014'");
  if (!schemaResult.rowCount) throw new Error('Schéma Logistique incomplet : exécuter les migrations jusqu’à 014.');

  await client.query('BEGIN');
  await client.query(`
    INSERT INTO logistics_sites(code,name,created_by,updated_by) VALUES
      ('G1','GADIMAT G1',$1,$1),('G2','GADIMAT G2',$1,$1),
      ('G3','GADIMAT G3',$1,$1),('G5','GADIMAT G5',$1,$1)
    ON CONFLICT(code) DO UPDATE SET active=true,deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_departments(code,name,created_by,updated_by) VALUES
      ('LOG','Logistique',$1,$1),('MAINT','Maintenance',$1,$1),('MAG','Magasin',$1,$1)
    ON CONFLICT(code) DO UPDATE SET active=true,deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_asset_categories(code,name,meter_type,requires_registration,created_by,updated_by) VALUES
      ('truck','Camion','odometer',true,$1,$1),
      ('light_commercial','Véhicule utilitaire léger','odometer',true,$1,$1),
      ('forklift','Chariot élévateur','hours',false,$1,$1)
    ON CONFLICT(code) DO UPDATE SET active=true,deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_service_providers(id,supplier_code,company_name,contact_name,phone,email,status,created_by,updated_by) VALUES
      ('d1000000-0000-4000-8000-000000000001','DEMO-GARAGE','Garage Atlas Services','Youssef Amrani','0522000011','atelier.demo@gadimat.test','active',$1,$1),
      ('d1000000-0000-4000-8000-000000000002','DEMO-PNEUS','Pneus Maroc Démo','Salma Idrissi','0522000022','pneus.demo@gadimat.test','active',$1,$1)
    ON CONFLICT(supplier_code) DO UPDATE SET company_name=EXCLUDED.company_name,status='active',deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_assets(id,fleet_number,registration_number,category_id,brand,model,manufacture_year,acquisition_date,purchase_cost,site_id,department_id,current_mileage,current_operating_hours,fuel_type,status,notes,created_by,updated_by) VALUES
      ('d2000000-0000-4000-8000-000000000001','DEMO-CAM-01','DEMO-101-A', (SELECT id FROM logistics_asset_categories WHERE code='truck'),'Mercedes','Actros',2022,CURRENT_DATE-INTERVAL '3 years',780000,(SELECT id FROM logistics_sites WHERE code='G1'),(SELECT id FROM logistics_departments WHERE code='LOG'),86450,0,'diesel','in_operation','Donnée de démonstration',$1,$1),
      ('d2000000-0000-4000-8000-000000000002','DEMO-CAM-02','DEMO-102-A', (SELECT id FROM logistics_asset_categories WHERE code='truck'),'Renault','T High',2021,CURRENT_DATE-INTERVAL '4 years',710000,(SELECT id FROM logistics_sites WHERE code='G2'),(SELECT id FROM logistics_departments WHERE code='LOG'),112300,0,'diesel','under_maintenance','Donnée de démonstration',$1,$1),
      ('d2000000-0000-4000-8000-000000000003','DEMO-UTI-01','DEMO-201-B', (SELECT id FROM logistics_asset_categories WHERE code='light_commercial'),'Ford','Transit',2023,CURRENT_DATE-INTERVAL '2 years',285000,(SELECT id FROM logistics_sites WHERE code='G1'),(SELECT id FROM logistics_departments WHERE code='LOG'),43820,0,'diesel','available','Donnée de démonstration',$1,$1),
      ('d2000000-0000-4000-8000-000000000004','DEMO-UTI-02','DEMO-202-B', (SELECT id FROM logistics_asset_categories WHERE code='light_commercial'),'Toyota','Hilux',2022,CURRENT_DATE-INTERVAL '3 years',340000,(SELECT id FROM logistics_sites WHERE code='G3'),(SELECT id FROM logistics_departments WHERE code='LOG'),67500,0,'diesel','in_operation','Donnée de démonstration',$1,$1),
      ('d2000000-0000-4000-8000-000000000005','DEMO-CHR-01',NULL, (SELECT id FROM logistics_asset_categories WHERE code='forklift'),'Toyota','8FD30',2020,CURRENT_DATE-INTERVAL '5 years',195000,(SELECT id FROM logistics_sites WHERE code='G5'),(SELECT id FROM logistics_departments WHERE code='MAG'),0,6240,'diesel','in_operation','Donnée de démonstration',$1,$1),
      ('d2000000-0000-4000-8000-000000000006','DEMO-CHR-02',NULL, (SELECT id FROM logistics_asset_categories WHERE code='forklift'),'Linde','H30D',2021,CURRENT_DATE-INTERVAL '4 years',220000,(SELECT id FROM logistics_sites WHERE code='G2'),(SELECT id FROM logistics_departments WHERE code='MAG'),0,4810,'diesel','immobilized','Donnée de démonstration',$1,$1)
    ON CONFLICT(fleet_number) DO UPDATE SET status=EXCLUDED.status,current_mileage=EXCLUDED.current_mileage,current_operating_hours=EXCLUDED.current_operating_hours,deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_drivers(employee_identifier,full_name,employee_status,professional_phone,professional_email,license_expiry_date,notes,created_by,updated_by) VALUES
      ('DEMO-CH-001','Karim Alaoui','active','0600000101','karim.demo@gadimat.test',CURRENT_DATE+INTERVAL '18 months','Donnée de démonstration',$1,$1),
      ('DEMO-CH-002','Nadia Bennani','active','0600000102','nadia.demo@gadimat.test',CURRENT_DATE+INTERVAL '10 months','Donnée de démonstration',$1,$1),
      ('DEMO-CH-003','Omar Tazi','active','0600000103','omar.demo@gadimat.test',CURRENT_DATE+INTERVAL '5 months','Donnée de démonstration',$1,$1),
      ('DEMO-CH-004','Imane El Fassi','active','0600000104','imane.demo@gadimat.test',CURRENT_DATE+INTERVAL '24 months','Donnée de démonstration',$1,$1)
    ON CONFLICT(employee_identifier) DO UPDATE SET employee_status='active',active=true,deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_driver_assignments(id,driver_id,asset_id,starts_at,is_primary,reason,created_by) VALUES
      ('d3000000-0000-4000-8000-000000000001',(SELECT id FROM logistics_drivers WHERE employee_identifier='DEMO-CH-001'),'d2000000-0000-4000-8000-000000000001',NOW()-INTERVAL '8 months',true,'Affectation démo',$1),
      ('d3000000-0000-4000-8000-000000000002',(SELECT id FROM logistics_drivers WHERE employee_identifier='DEMO-CH-002'),'d2000000-0000-4000-8000-000000000003',NOW()-INTERVAL '5 months',true,'Affectation démo',$1),
      ('d3000000-0000-4000-8000-000000000003',(SELECT id FROM logistics_drivers WHERE employee_identifier='DEMO-CH-003'),'d2000000-0000-4000-8000-000000000004',NOW()-INTERVAL '4 months',true,'Affectation démo',$1)
    ON CONFLICT(id) DO NOTHING
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_maintenance_interventions(id,reference,asset_id,maintenance_kind,category,issue_description,priority,requester_user_id,provider_id,reported_at,planned_start_at,planned_end_at,actual_start_at,actual_end_at,estimated_cost,actual_cost,downtime_hours,status,completion_notes,created_by,updated_by) VALUES
      ('d4000000-0000-4000-8000-000000000001','DEMO-INT-001','d2000000-0000-4000-8000-000000000001','preventive','oil_change','Vidange et contrôle périodique','normal',$1,'d1000000-0000-4000-8000-000000000001',NOW()-INTERVAL '8 months',NOW()-INTERVAL '8 months',NOW()-INTERVAL '8 months'+INTERVAL '1 day',NOW()-INTERVAL '8 months',NOW()-INTERVAL '8 months'+INTERVAL '6 hours',3200,3050,6,'completed','Intervention terminée',$1,$1),
      ('d4000000-0000-4000-8000-000000000002','DEMO-INT-002','d2000000-0000-4000-8000-000000000002','corrective','mechanical','Remplacement embrayage','high',$1,'d1000000-0000-4000-8000-000000000001',NOW()-INTERVAL '4 months',NOW()-INTERVAL '4 months',NOW()-INTERVAL '4 months'+INTERVAL '3 days',NOW()-INTERVAL '4 months',NOW()-INTERVAL '4 months'+INTERVAL '2 days',18500,17900,48,'completed','Essai routier conforme',$1,$1),
      ('d4000000-0000-4000-8000-000000000003','DEMO-INT-003','d2000000-0000-4000-8000-000000000003','corrective','electrical','Défaut alternateur','normal',$1,'d1000000-0000-4000-8000-000000000001',NOW()-INTERVAL '2 months',NOW()-INTERVAL '2 months',NOW()-INTERVAL '2 months'+INTERVAL '1 day',NOW()-INTERVAL '2 months',NOW()-INTERVAL '2 months'+INTERVAL '5 hours',4800,4450,5,'completed','Alternateur remplacé',$1,$1),
      ('d4000000-0000-4000-8000-000000000004','DEMO-INT-004','d2000000-0000-4000-8000-000000000005','preventive','inspection','Révision des 6 000 heures','normal',$1,NULL,NOW()-INTERVAL '20 days',NOW()-INTERVAL '18 days',NOW()-INTERVAL '17 days',NOW()-INTERVAL '18 days',NOW()-INTERVAL '17 days',6200,5900,12,'completed','Révision complète',$1,$1),
      ('d4000000-0000-4000-8000-000000000005','DEMO-INT-005','d2000000-0000-4000-8000-000000000002','corrective','breakdown','Perte de puissance moteur','critical',$1,'d1000000-0000-4000-8000-000000000001',NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 day',NOW()+INTERVAL '2 days',NOW()-INTERVAL '1 day',NULL,15000,NULL,28,'in_progress',NULL,$1,$1),
      ('d4000000-0000-4000-8000-000000000006','DEMO-INT-006','d2000000-0000-4000-8000-000000000006','corrective','mechanical','Fuite circuit hydraulique','high',$1,NULL,NOW()-INTERVAL '1 day',NOW()+INTERVAL '1 day',NOW()+INTERVAL '3 days',NULL,NULL,8500,NULL,20,'planned',NULL,$1,$1)
    ON CONFLICT(reference) DO UPDATE SET status=EXCLUDED.status,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_fuel_transactions(id,asset_id,occurred_at,fuel_type,quantity,unit_price,total_amount,meter_type,meter_reading,receipt_reference,consumption_rate,review_status,fingerprint,created_by) VALUES
      ('d5000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',NOW()-INTERVAL '7 months','diesel',310,13.20,4092,'odometer',70100,'DEMO-CARB-001',31.0,'clear',repeat('1',64),$1),
      ('d5000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001',NOW()-INTERVAL '5 months','diesel',295,13.10,3864.50,'odometer',75600,'DEMO-CARB-002',29.5,'clear',repeat('2',64),$1),
      ('d5000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000002',NOW()-INTERVAL '4 months','diesel',340,13.25,4505,'odometer',105200,'DEMO-CARB-003',34.0,'clear',repeat('3',64),$1),
      ('d5000000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000003',NOW()-INTERVAL '3 months','diesel',92,13.40,1232.80,'odometer',38900,'DEMO-CARB-004',9.2,'clear',repeat('4',64),$1),
      ('d5000000-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000004',NOW()-INTERVAL '2 months','diesel',115,13.35,1535.25,'odometer',62100,'DEMO-CARB-005',11.5,'clear',repeat('5',64),$1),
      ('d5000000-0000-4000-8000-000000000006','d2000000-0000-4000-8000-000000000001',NOW()-INTERVAL '25 days','diesel',305,13.05,3980.25,'odometer',83400,'DEMO-CARB-006',30.5,'clear',repeat('6',64),$1),
      ('d5000000-0000-4000-8000-000000000007','d2000000-0000-4000-8000-000000000003',NOW()-INTERVAL '12 days','diesel',88,13.15,1157.20,'odometer',43100,'DEMO-CARB-007',8.8,'clear',repeat('7',64),$1),
      ('d5000000-0000-4000-8000-000000000008','d2000000-0000-4000-8000-000000000002',NOW()-INTERVAL '6 days','diesel',355,13.30,4721.50,'odometer',111900,'DEMO-CARB-008',35.5,'flagged',repeat('8',64),$1)
    ON CONFLICT(id) DO NOTHING
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_tires(id,internal_id,brand,model,size,provider_id,purchased_at,purchase_cost,status,current_asset_id,current_position_id,notes,created_by,updated_by) VALUES
      ('d6000000-0000-4000-8000-000000000001','DEMO-PNEU-001','Michelin','X Multi','315/80 R22.5','d1000000-0000-4000-8000-000000000002',CURRENT_DATE-INTERVAL '6 months',4200,'installed','d2000000-0000-4000-8000-000000000001',(SELECT id FROM logistics_tire_positions WHERE code='front_left'),'Donnée de démonstration',$1,$1),
      ('d6000000-0000-4000-8000-000000000002','DEMO-PNEU-002','Michelin','X Multi','315/80 R22.5','d1000000-0000-4000-8000-000000000002',CURRENT_DATE-INTERVAL '6 months',4200,'installed','d2000000-0000-4000-8000-000000000001',(SELECT id FROM logistics_tire_positions WHERE code='front_right'),'Donnée de démonstration',$1,$1)
    ON CONFLICT(internal_id) DO NOTHING
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_tire_movements(id,tire_id,operation,target_asset_id,target_position_id,occurred_at,cost,notes,created_by) VALUES
      ('d6100000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001','installed','d2000000-0000-4000-8000-000000000001',(SELECT id FROM logistics_tire_positions WHERE code='front_left'),NOW()-INTERVAL '6 months',250,'Montage démo',$1),
      ('d6100000-0000-4000-8000-000000000002','d6000000-0000-4000-8000-000000000002','installed','d2000000-0000-4000-8000-000000000001',(SELECT id FROM logistics_tire_positions WHERE code='front_right'),NOW()-INTERVAL '6 months',250,'Montage démo',$1)
    ON CONFLICT(id) DO NOTHING
  `,[actorId]);
  await client.query(`
    INSERT INTO logistics_spare_parts(id,sku,name,category,unit,average_cost,quantity_on_hand,minimum_quantity,reorder_quantity,location,preferred_provider_id,status,notes,created_by,updated_by) VALUES
      ('d7000000-0000-4000-8000-000000000001','DEMO-FILTRE-HUILE','Filtre à huile camion','Filtration','piece',180,18,8,20,'MAG-A-01','d1000000-0000-4000-8000-000000000001','active','Donnée de démonstration',$1,$1),
      ('d7000000-0000-4000-8000-000000000002','DEMO-HUILE-15W40','Huile moteur 15W40','Lubrifiants','liter',48,75,40,100,'MAG-B-02','d1000000-0000-4000-8000-000000000001','active','Donnée de démonstration',$1,$1),
      ('d7000000-0000-4000-8000-000000000003','DEMO-COURROIE','Courroie alternateur','Mécanique','piece',320,4,6,10,'MAG-A-05','d1000000-0000-4000-8000-000000000001','active','Stock sous minimum',$1,$1),
      ('d7000000-0000-4000-8000-000000000004','DEMO-PLAQUETTES','Jeu de plaquettes de frein','Freinage','set',950,9,4,8,'MAG-C-03','d1000000-0000-4000-8000-000000000001','active','Donnée de démonstration',$1,$1)
    ON CONFLICT(sku) DO UPDATE SET quantity_on_hand=EXCLUDED.quantity_on_hand,average_cost=EXCLUDED.average_cost,status='active',deleted_at=NULL,updated_at=NOW(),updated_by=EXCLUDED.updated_by
  `,[actorId]);
  await client.query('COMMIT');
  console.log('Données de démonstration Logistique créées ou déjà présentes.');
  console.log('4 sites, 3 catégories, 6 actifs, 4 conducteurs, 6 interventions, 8 pleins, 2 pneus et 4 pièces.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  client.release();
  await Promise.all([central.end(),logistics.end()]);
}
