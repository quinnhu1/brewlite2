import {performance} from 'node:perf_hooks';
import {randomInt,randomUUID} from 'node:crypto';
const base=(process.env.API_BASE_URL??'http://127.0.0.1:3001').replace(/\/$/,'');
const samples=new Map();
let token=process.env.PERF_BEARER_TOKEN;
async function api(path,{body,key,method}={}) {
 const response=await fetch(base+path,{
  method:method??(body?'POST':'GET'),
  headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),
 });
 if(!response.ok) throw new Error(`${method??(body?'POST':'GET')} ${path}: HTTP ${response.status}`);
 return response.json();
}
async function measure(route,operation,concurrency=1) {
 const start=performance.now();const result=await operation();
 const entry=samples.get(route)??{concurrency,values:[]};
 entry.values.push(performance.now()-start);samples.set(route,entry);return result;
}
async function readBench(route,path,body) {
 for(let i=0;i<3;i++) await api(path,{body});
 for(let i=0;i<20;i++) await Promise.all(Array.from({length:5},()=>measure(route,()=>api(path,{body}),5)));
}
const products=await api('/products');
if(!Array.isArray(products)||!products.length) throw new Error('Need a seeded catalog.');
const product=products.find(p=>p.stock>=5)??products[0];
const detail=await api('/products/'+product.productId);
await readBench('GET /health','/health');
await readBench('GET /products','/products');
await readBench('GET /products/:id','/products/'+product.productId);
const allowWrites=process.env.PERF_ALLOW_WRITES==='true';
if(allowWrites) {
 // The write benchmark is a local disposable fixture, never a production load generator.
 const db=new URL(process.env.DATABASE_URL??'invalid:');
 if(!db.pathname.endsWith('_test')||!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))
  throw new Error('Write measurements require a loopback API and a disposable *_test database.');
 if((await api('/payments/config')).provider!=='mock') throw new Error('Write measurements require mock payments.');
 let identity;
 for(let i=0;i<5;i++) {
  const user={email:`perf-${randomUUID().slice(0,12)}@test.local`,phone:'08'+String(randomInt(100_000_000)).padStart(8,'0'),name:'Performance test',password:'performance-test-password123'};
  await measure('POST /auth/register',()=>api('/auth/register',{body:user}));
  identity=user;
 }
 for(let i=0;i<5;i++) {
  const login=await measure('POST /auth/login',()=>api('/auth/login',{body:{identifier:identity.email,password:identity.password}}));token=login.accessToken;
 }
 const body={customer_name:identity.name,customer_phone:identity.phone,pickup_method:'AT_COUNTER',items:[{product_id:product.productId,size:detail.product_size[0].size,quantity:1,topping_ids:[]}]};
 await readBench('POST /orders/quote','/orders/quote',body);
 for(let i=0;i<20;i++) {
  const order=await measure('POST /orders',()=>api('/orders',{body,key:randomUUID()}));
  await measure('POST /payments (mock)',()=>api('/payments',{body:{order_id:order.order_id,method:'banking'},key:randomUUID()}));
  await measure('GET /orders/:id',()=>api('/orders/'+order.order_id));
  await measure('POST /orders/:id/cancel (mock refund)',()=>api(`/orders/${order.order_id}/cancel`,{body:{reason:'Disposable performance check'}}));
 }
}
if(token) {
 await readBench('GET /auth/me','/auth/me');
 await readBench('GET /orders/me','/orders/me');
}
const round=n=>Math.round(n*100)/100;
const results=[...samples].map(([route,{concurrency,values}])=>{
 values.sort((a,b)=>a-b);
 return {route,samples:values.length,concurrency,p50_ms:round(values[Math.ceil(values.length*.5)-1]),p95_ms:round(values[Math.ceil(values.length*.95)-1]),max_ms:round(values.at(-1)),budget_ms:500,all_observed_under_budget:values.every(n=>n<500)};
});
console.log(JSON.stringify({environment:'Measured API_BASE_URL; this is not a public availability/SLA guarantee.',writes:allowWrites,external_gateway_network_measured:false,results},null,2));
if(results.some(r=>!r.all_observed_under_budget)) process.exitCode=1;
