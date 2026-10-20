export function evaluateTireMovement({ status, operation }) {
  const allowed={
    stock:['installed','sent_repair','retired','scrapped'], installed:['removed','transferred'],
    repair:['returned_repair','retired','scrapped'], retired:[], scrapped:[],
  };
  if(!allowed[status]?.includes(operation))return{allowed:false,code:'INVALID_TIRE_MOVEMENT',message:'Mouvement incompatible avec l’état actuel du pneumatique.'};
  const nextStatus={installed:'installed',removed:'stock',transferred:'installed',sent_repair:'repair',returned_repair:'stock',retired:'retired',scrapped:'scrapped'}[operation];
  return{allowed:true,nextStatus};
}
