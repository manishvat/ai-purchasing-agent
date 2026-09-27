const vendors = [
  {id:"v-101",name:"Northstar Office Systems",category:"laptop",unitPrice:78500,currency:"INR",stock:42,deliveryDays:2,warrantyYears:3,rating:4.7,returnDays:15,paymentTerms:"Net 30",risk:"low"},
  {id:"v-102",name:"PrimeTech Supplies",category:"laptop",unitPrice:74800,currency:"INR",stock:18,deliveryDays:6,warrantyYears:2,rating:4.3,returnDays:7,paymentTerms:"Net 15",risk:"medium"},
  {id:"v-103",name:"Metro Digital Procurement",category:"laptop",unitPrice:81900,currency:"INR",stock:70,deliveryDays:1,warrantyYears:3,rating:4.8,returnDays:30,paymentTerms:"Net 45",risk:"low"},
  {id:"v-104",name:"ValueHub Business Store",category:"laptop",unitPrice:69900,currency:"INR",stock:9,deliveryDays:10,warrantyYears:1,rating:3.9,returnDays:5,paymentTerms:"Advance",risk:"high"}
];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function scoreVendor(v,r){
 const b=r.budget/r.quantity,price=clamp(100-Math.max(0,(v.unitPrice-b)/b*100),0,100),delivery=clamp(100-(v.deliveryDays-1)*12,0,100),quality=v.rating/5*100,warranty=clamp(v.warrantyYears/3*100,0,100),risk=v.risk==="low"?100:v.risk==="medium"?65:25,stock=clamp(v.stock/r.quantity*100,0,100);
 let w={price:.35,delivery:.2,quality:.2,warranty:.1,risk:.1,stock:.05};
 if(r.priority==="urgent")w={price:.25,delivery:.35,quality:.15,warranty:.1,risk:.1,stock:.05};
 if(r.priority==="quality")w={price:.2,delivery:.1,quality:.3,warranty:.2,risk:.15,stock:.05};
 const score=price*w.price+delivery*w.delivery+quality*w.quality+warranty*w.warranty+risk*w.risk+stock*w.stock;
 return {...v,totalCost:v.unitPrice*r.quantity,budgetFit:v.unitPrice*r.quantity<=r.budget,score:Math.round(score*10)/10};
}
function investigate(r){return vendors.filter(v=>v.category===r.category).map(v=>scoreVendor(v,r)).sort((a,b)=>b.score-a.score)}
function decide(r,ranked){
 const feasible=ranked.filter(v=>v.stock>=r.quantity&&v.totalCost<=r.budget);
 const selected=feasible[0]||ranked.find(v=>v.stock>=r.quantity)||ranked[0];
 return {status:feasible.length?"approved":"review_required",selectedVendor:selected,reasons:[
  selected.name+" scores "+selected.score+"/100 on the configured procurement policy.",
  selected.totalCost<=r.budget?"Total cost ₹"+selected.totalCost.toLocaleString("en-IN")+" is within the ₹"+r.budget.toLocaleString("en-IN")+" budget.":"No fully feasible vendor fits the budget; the closest available option is surfaced for review.",
  selected.deliveryDays+"-day delivery and "+selected.warrantyYears+"-year warranty were included in the decision.",
  selected.risk+" supplier risk and available stock ("+selected.stock+") were considered."
 ],confidence:feasible.length?Math.min(96,Math.round(72+selected.score/5)):61};
}
function action(r,d){const v=d.selectedVendor;return {type:"purchase_order_draft",status:"draft",poNumber:"PO-"+Date.now().toString().slice(-8),vendorId:v.id,vendorName:v.name,items:[{description:r.item,quantity:r.quantity,unitPrice:v.unitPrice,total:v.totalCost}],subtotal:v.totalCost,currency:"INR",paymentTerms:v.paymentTerms,expectedDelivery:v.deliveryDays+" day(s)",approvalRequired:d.status!=="approved",note:"Mock action only — no real supplier order is placed."};}
function validate(r,d,a){const v=d.selectedVendor,checks=[["Vendor exists",!!v],["Requested quantity in stock",v.stock>=r.quantity],["Budget check",v.totalCost<=r.budget],["Purchase order total",a.subtotal===v.unitPrice*r.quantity],["Delivery SLA captured",v.deliveryDays>0],["Mock action safety",a.note.includes("Mock")]].map(([name,passed])=>({name,passed}));const passed=checks.filter(c=>c.passed).length;return {checks,passed,total:checks.length,outcome:passed===checks.length?"validated":"needs_review"};}
async function explain(r,d){
 if(!process.env.OPENAI_API_KEY)return null;
 try{
  const x=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",messages:[{role:"system",content:"You are a procurement analyst. Give a concise 3-bullet explanation using only supplied facts."},{role:"user",content:JSON.stringify({request:r,decision:d})}],temperature:.1})});
  if(!x.ok)return null; const j=await x.json(); return j.choices?.[0]?.message?.content||null;
 }catch{return null}
}
module.exports=async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"POST required"});
 const body=req.body||{},r={item:String(body.item||"Business laptops"),category:String(body.category||"laptop"),quantity:Number(body.quantity||5),budget:Number(body.budget||400000),priority:["standard","urgent","quality"].includes(body.priority)?body.priority:"standard"};
 if(!Number.isFinite(r.quantity)||r.quantity<1||r.quantity>1000)return res.status(400).json({error:"Quantity must be between 1 and 1000."});
 if(!Number.isFinite(r.budget)||r.budget<=0)return res.status(400).json({error:"Budget must be greater than zero."});
 const investigation=investigate(r),decision=decide(r,investigation),act=action(r,decision),validation=validate(r,decision,act),aiExplanation=await explain(r,decision);
 res.status(200).json({request:r,pipeline:{investigate:investigation,decide:decision,act,validate:validation},aiExplanation,generatedAt:new Date().toISOString()});
};