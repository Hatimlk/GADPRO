import { centralQuery, logisticsQuery } from '../../../db.js';

export function scopeAllows(dataScope,siteId,departmentId=null){const scope=dataScope&&typeof dataScope==='object'?dataScope:{};if(scope.allSites===false&&(!Array.isArray(scope.siteIds)||!scope.siteIds.includes(siteId)))return false;if(Array.isArray(scope.departmentIds)&&(!departmentId||!scope.departmentIds.includes(departmentId)))return false;return true;}

export async function notifyUser({userId,category='system',severity='info',title,message,entityType=null,entityId=null,actionUrl=null,deduplicationKey}){if(!userId)return;await logisticsQuery(`INSERT INTO logistics_notifications(recipient_user_id,category,severity,title,message,entity_type,entity_id,action_url,deduplication_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(recipient_user_id,deduplication_key) DO NOTHING`,[userId,category,severity,title,message,entityType,entityId,actionUrl,deduplicationKey]);}

export async function notifyPermission({permission,siteId,departmentId=null,excludeUserId=null,...notification}){const recipients=await centralQuery(`SELECT u.id,ma.data_scope FROM users u JOIN module_access ma ON ma.user_id=u.id WHERE u.active=true AND ma.active=true AND ma.module_code='logistique' AND (ma.permissions @> $1::jsonb OR ma.permissions @> '["*"]'::jsonb)`,[JSON.stringify([permission])]);for(const recipient of recipients.rows){if(recipient.id===excludeUserId||!scopeAllows(recipient.data_scope,siteId,departmentId))continue;await notifyUser({userId:recipient.id,...notification});}}

export async function safelyNotify(work){try{await work();}catch(error){console.error('Notification Logistique non créée:',error.message);}}
