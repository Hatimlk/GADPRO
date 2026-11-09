CREATE TABLE IF NOT EXISTS logistics_oil_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES logistics_assets(id) ON DELETE SET NULL,
  registration_number VARCHAR(80) NOT NULL UNIQUE,
  driver_name VARCHAR(200),
  vehicle_type VARCHAR(80),
  vehicle_name VARCHAR(200) NOT NULL,
  acquisition_date DATE,
  current_mileage NUMERIC(14,1) NOT NULL CHECK (current_mileage >= 0),
  operation_label VARCHAR(120) NOT NULL,
  secondary_operation_label VARCHAR(120),
  service_interval_km NUMERIC(14,1) NOT NULL CHECK (service_interval_km > 0),
  last_service_mileage NUMERIC(14,1) NOT NULL CHECK (last_service_mileage >= 0),
  next_service_mileage NUMERIC(14,1) NOT NULL CHECK (next_service_mileage >= 0),
  last_service_date DATE,
  mileage_updated_at DATE,
  alert_threshold_km NUMERIC(14,1) NOT NULL DEFAULT 2000 CHECK (alert_threshold_km >= 0),
  manual_status VARCHAR(30) CHECK (manual_status IN ('accident','inactive')),
  notes TEXT,
  source VARCHAR(80) NOT NULL DEFAULT 'Vidange.xlsx',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS logistics_oil_change_next_idx ON logistics_oil_change_tracking(next_service_mileage);
CREATE INDEX IF NOT EXISTS logistics_oil_change_asset_idx ON logistics_oil_change_tracking(asset_id);

CREATE TABLE IF NOT EXISTS logistics_oil_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES logistics_oil_change_tracking(id) ON DELETE RESTRICT,
  service_date DATE NOT NULL,
  service_mileage NUMERIC(14,1) NOT NULL CHECK (service_mileage >= 0),
  operation_label VARCHAR(120) NOT NULL,
  previous_service_mileage NUMERIC(14,1),
  next_service_mileage NUMERIC(14,1) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS logistics_oil_change_history_tracking_idx ON logistics_oil_change_history(tracking_id, service_date DESC);

INSERT INTO logistics_oil_change_tracking
  (registration_number,driver_name,vehicle_type,vehicle_name,acquisition_date,current_mileage,operation_label,secondary_operation_label,service_interval_km,last_service_mileage,next_service_mileage,last_service_date,mileage_updated_at,manual_status,notes)
VALUES
  ('39591 A 34','BOUABIDE','40 T','MERCEDES ACTROS','2015-02-17',127355,'S+M (45 000 Km)','L (55 000 Km)',40000,90037,130037,'2026-02-18',NULL,NULL,'Alerte du classeur : Sans. Vidange ralentisseur le 11/10/2023 au km 781 146.'),
  ('11567 A 34','LAHCEN','40 T','MERCEDES AXOR','2003-03-18',31252,'S+M (30 000 Km)','L (60 000 Km)',30000,22367,52367,'2026-10-02',NULL,NULL,NULL),
  ('23980 A 34','YOUSSEF','40 T','VOLVO FH','2008-10-31',1655762,'S+M (30 000 Km)','L (45 000 Km)',30000,1655762,1685762,'2026-10-28','2026-11-04',NULL,NULL),
  ('52134 A 34','LATRACH','40 T','MERCEDES AXOR','2018-09-10',811335,'S+M (45 000 Km)','L (60 000 Km)',40000,788535,828535,'2026-02-24',NULL,NULL,NULL),
  ('22891 A 34','SALAH EDDINE','40 T','VOLVO FH','2008-06-04',1726491,'S+M (30 000 Km)','L (25 000 Km)',30000,1700278,1730278,'2026-04-27',NULL,NULL,NULL),
  ('16416 A 34','ABDELHAK','40 T','MERCEDES AXOR 2040LS','2005-07-11',613778,'S+M (30 000 Km)','L (60 000 Km)',43000,711615,754615,'2024-02-28','2023-11-30','accident','Valeurs reprises du classeur ; véhicule signalé Accident.'),
  ('49141 A 34','SAID','40 T','MERCEDES ACTROS','2017-10-19',911346,'S+M (45 000 Km)','L (60 000 Km)',40000,893875,933875,'2026-09-02',NULL,NULL,NULL),
  ('49143 A 34','ABDELKADER','40 T','MERCEDES AXOR','2017-10-19',839733,'S+M (40 000 Km)','L (60 000 Km)',35000,837518,872518,'2026-10-26',NULL,NULL,NULL),
  ('55989 A 34','MILOUD','40 T','VOLVO N10','1985-06-01',961561,'S+M (10 000 Km)','L (20 000 Km)',12000,953417,965417,'2026-05-18',NULL,NULL,NULL),
  ('28344 A 34','RACHID','17 T','MITSUBISH FIGHTER','2010-03-23',444313,'S+M (20 000 Km)','L (30 000 Km)',12000,444313,456313,'2026-11-02',NULL,NULL,NULL),
  ('18753 A 34','MED HOUKAR','17 T','MITSUBISH FIGHTER','2006-08-17',398475,'S+M (20 000 Km)','L (30 000 Km)',12000,389298,401298,'2026-09-21',NULL,NULL,NULL),
  ('52623 A 34','ID BOUKIS','17 T','FUSO FIGHTER','2018-08-31',612891,'S+M (20 000 Km)','L (30 000 Km)',10000,610695,620695,'2026-10-22',NULL,NULL,NULL),
  ('31541 A 34','HAMID','14 T','ISUZU','1992-06-29',107746,'S+M (10 000 Km)','L (20 000 Km)',10000,102637,112637,'2026-07-20',NULL,NULL,NULL),
  ('29751- A-34','OMAR','14 T','MITSUBISH FK','1990-01-03',160667,'S+M (10 000 Km)','L (20 000 Km)',12000,151200,163200,'2026-05-11',NULL,NULL,NULL),
  ('67088- A-34','ZAKARIA','17 T','MITSUBISH FUSO FIGHTER','2023-04-17',315148,'S+M (10 000 Km)','L (20 000 Km)',12000,308837,320837,'2026-05-11',NULL,NULL,NULL),
  ('66913- A-34','ABDERHMAN','40 T','VOLVO FM 450','2023-03-31',387018,'S+M (10 000 Km)','L (20 000 Km)',30000,382425,412425,'2026-10-12',NULL,NULL,NULL),
  ('66032-A-34','LHOUSSEIN','4,1 T','HUYNDAI H350','2022-11-10',50088,'S+M (10 000 Km)','L (20 000 Km)',10000,49046,59046,'2026-01-22',NULL,NULL,NULL),
  ('69256-A-34','BOULGANA','40 T','VOLVO FM 450','2024-02-27',294988,'S+M (10 000 Km)','L (20 000 Km)',30000,275139,305139,'2026-09-09',NULL,NULL,NULL),
  ('69815-A-34','ALI','17 T','FUSO FIGHTER','2024-04-04',200333,'S+M (10 000 Km)','L (20 000 Km)',12000,194313,206313,'2026-10-12',NULL,NULL,NULL),
  ('67008-A-34','ABDELTIF','1,2 T','KIA','2023-04-06',86457,'S+M (10 000 Km)','L (20 000 Km)',10000,80233,90233,'2026-02-10',NULL,NULL,NULL),
  ('73040-A-34','AZIZ','17 T','FUSO FIGHTER','2025-05-02',120812,'S+M (10 000 Km)','L (20 000 Km)',12000,116942,128942,'2026-10-09',NULL,NULL,NULL),
  ('72573-A34','ABOURIS','40 T','VOLVO FM 450','2025-04-08',162185,'S+M (10 000 Km)','L (20 000 Km)',30000,141970,171970,'2026-09-08',NULL,NULL,NULL),
  ('76898 A 34','ABDESSLAM','40 T','VOLVO','2026-04-01',59782,'S+M (10 000 Km)','L (20 000 Km)',35000,35427,70427,NULL,NULL,NULL,NULL)
ON CONFLICT (registration_number) DO NOTHING;

UPDATE logistics_oil_change_tracking o
SET asset_id = a.id
FROM logistics_assets a
WHERE o.asset_id IS NULL
  AND a.deleted_at IS NULL
  AND a.registration_number IS NOT NULL
  AND regexp_replace(upper(a.registration_number),'[^A-Z0-9]','','g') = regexp_replace(upper(o.registration_number),'[^A-Z0-9]','','g');
