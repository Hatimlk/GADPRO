const round=(value,decimals)=>Number(Number(value).toFixed(decimals));
export function calculateStockMutation({quantityOnHand,averageCost,quantitySigned,unitCost,allowNegative=false}){
  const currentQuantity=Number(quantityOnHand);const currentAverage=Number(averageCost);const signed=Number(quantitySigned);const cost=Number(unitCost);
  if(!Number.isFinite(signed)||signed===0||!Number.isFinite(cost)||cost<0)return{allowed:false,code:'INVALID_STOCK_VALUE'};
  const balance=round(currentQuantity+signed,3);if(balance<0&&!allowNegative)return{allowed:false,code:'NEGATIVE_STOCK',message:'Stock insuffisant.'};
  const inventoryValue=currentQuantity*currentAverage+signed*cost;const nextAverage=balance>0?round(Math.max(0,inventoryValue/balance),4):balance===0?0:currentAverage;
  return{allowed:true,balanceAfter:balance,averageCostAfter:nextAverage,totalValue:round(signed*cost,2)};
}
export function signedQuantity(operation,quantity){const value=Number(quantity);if(operation==='issue')return-Math.abs(value);if(['receipt','return'].includes(operation))return Math.abs(value);return value;}
