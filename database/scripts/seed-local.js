import bcrypt from 'bcryptjs';
import pg from 'pg';

if (process.env.NODE_ENV === 'production') throw new Error('Le seed local est interdit en production.');
const urls = {
  central: process.env.CENTRAL_DATABASE_URL || 'postgresql://gadimat:gadimat_local@127.0.0.1:5541/gadimat_identity',
  cheques: process.env.CHEQUES_DATABASE_URL || 'postgresql://gadimat:gadimat_local@127.0.0.1:5542/gadimat_cheques',
  impayes: process.env.IMPAYES_DATABASE_URL || 'postgresql://gadimat:gadimat_local@127.0.0.1:5543/gadimat_impayes',
  logistics: process.env.LOGISTICS_DATABASE_URL || 'postgresql://gadimat:gadimat_local@127.0.0.1:5544/gadimat_logistique',
};
const central = new pg.Pool({ connectionString: urls.central });
const cheques = new pg.Pool({ connectionString: urls.cheques });
const impayes = new pg.Pool({ connectionString: urls.impayes });
const logistics = new pg.Pool({ connectionString: urls.logistics });
const email = 'admin.local@gadimat.test';
const password = 'GadimatLocal!2026';

try {
  const hash = await bcrypt.hash(password, 12);
  const cq = await cheques.query(`INSERT INTO users(name,email,password_hash,role,status) VALUES('Administrateur local',$1,$2,'Administrateur','Actif') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [email, hash]);
  await cheques.query(`INSERT INTO consumption_branches(code,name) VALUES ('G1','G1'),('G2','G2'),('G3','G3'),('G5','G5') ON CONFLICT(code) DO NOTHING`);
  await cheques.query(`INSERT INTO bank_accounts(id,bank_name,rib) VALUES('local-account','Banque de démonstration','000 000 000 000') ON CONFLICT(id) DO NOTHING`);
  await cheques.query(`INSERT INTO partners(type,name,contact,phone,balance) SELECT 'Client','Client synthétique','Contact local','0600000000',0 WHERE NOT EXISTS (SELECT 1 FROM partners WHERE name='Client synthétique')`);

  const iq = await impayes.query(`INSERT INTO users(nom,email,mot_de_passe_hash,role,actif) VALUES('Administrateur local',$1,$2,'admin',true) ON CONFLICT(email) DO UPDATE SET mot_de_passe_hash=EXCLUDED.mot_de_passe_hash RETURNING id`, [email, hash]);
  const cu = await central.query(`INSERT INTO users(name,email,email_normalized,password_hash,active,platform_admin) VALUES('Administrateur local',$1,$1,$2,true,true) ON CONFLICT(email_normalized) DO UPDATE SET password_hash=EXCLUDED.password_hash,active=true,platform_admin=true RETURNING id`, [email, hash]);
  const accesses = [['cheques','Administrateur'],['consommations','Administrateur'],['impayes','admin'],['administration','admin'],['logistique','logistics_admin']];
  for (const [module, role] of accesses) await central.query(`INSERT INTO module_access(user_id,module_code,role,permissions) VALUES($1,$2,$3,'["read","write","admin","*"]') ON CONFLICT(user_id,module_code) DO UPDATE SET role=EXCLUDED.role,permissions=EXCLUDED.permissions,active=true`, [cu.rows[0].id, module, role]);
  await central.query(`INSERT INTO legacy_identities(central_user_id,source,legacy_user_id) VALUES($1,'cheques',$2) ON CONFLICT(source,legacy_user_id) DO UPDATE SET central_user_id=EXCLUDED.central_user_id`, [cu.rows[0].id, String(cq.rows[0].id)]);
  await central.query(`INSERT INTO legacy_identities(central_user_id,source,legacy_user_id) VALUES($1,'impayes',$2) ON CONFLICT(source,legacy_user_id) DO UPDATE SET central_user_id=EXCLUDED.central_user_id`, [cu.rows[0].id, String(iq.rows[0].id)]);
  await logistics.query(`INSERT INTO logistics_sites(code,name) VALUES ('G1','G1'),('G2','G2'),('G3','G3'),('G5','G5') ON CONFLICT(code) DO NOTHING`);
  await logistics.query(`INSERT INTO logistics_asset_categories(code,name,meter_type,requires_registration) VALUES
    ('truck','Camion','odometer',true),
    ('light_commercial','Véhicule utilitaire léger','odometer',true),
    ('passenger_vehicle','Véhicule de tourisme','odometer',true),
    ('forklift','Chariot élévateur','hours',false),
    ('handling_equipment','Équipement de manutention','hours',false),
    ('trailer','Remorque','none',true),
    ('other','Autre équipement','none',false)
    ON CONFLICT(code) DO NOTHING`);
  console.log(`Données locales créées. Connexion: ${email} / ${password}`);
} finally { await Promise.all([central.end(), cheques.end(), impayes.end(), logistics.end()]); }
