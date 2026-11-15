import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
const values=new Map();
const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
const {useCartStore:store}=await import('../../apps/web/src/store/useCartStore.ts');
const {apiRequest}=await import('../../apps/web/src/lib/api/client.ts');
const item={product_id:'product',product_name:'Espresso',image_url:'/images/espresso.jpg',base_price:10000,size:'S',add_price:0,toppings:[],quantity:1,stock:5};
function checkout(userId){return {userId,key:'checkout-key',paymentKey:'payment-key',orderId:'order',body:{items:[],pickup_method:'AT_COUNTER',customer_name:'Test',customer_phone:'0901234567'},rows:[]};}
beforeEach(()=>{values.clear();store.getState().clearSession();});
test('guest cart is adopted by the first authenticated account',()=>{
 store.getState().addItem(item);store.getState().bindUser('A');
 assert.equal(store.getState().ownerUserId,'A');assert.equal(store.getState().items.length,1);
});
test('switching account clears replacement, checkout, promo and the previous account cart',()=>{
 store.getState().bindUser('A');store.getState().addItem(item);store.getState().setCheckout(checkout('A'));
 store.getState().setReplacementOrderId('old-order','A');store.getState().setPromotionCode('OLD');
 store.getState().bindUser('B');
 assert.equal(store.getState().ownerUserId,'B');assert.equal(store.getState().replacementOrderId,null);
 assert.equal(store.getState().checkout,null);assert.equal(store.getState().promotionCode,'');assert.equal(store.getState().items.length,0);
 store.getState().setCheckout(checkout('B'));assert.equal(store.getState().checkout.userId,'B');
});
test('logout clears persisted private checkout information',()=>{
 store.getState().bindUser('A');store.getState().setCheckout(checkout('A'));store.getState().setReplacementOrderId('old-order','A');
 store.getState().clearSession();const saved=JSON.parse(storage.getItem('brewlite-cart-v3')).state;
 assert.equal(saved.checkout,null);assert.equal(saved.replacementOrderId,null);assert.equal(saved.ownerUserId,null);
});
test('late writes from the previous account cannot restore its checkout or replacement',()=>{
 store.getState().bindUser('B');store.getState().setCheckout(checkout('A'));store.getState().setReplacementOrderId('old-order','A');
 assert.equal(store.getState().checkout,null);assert.equal(store.getState().replacementOrderId,null);
});
test('refresh preserves a checkout belonging to the same account',async()=>{
 store.getState().bindUser('A');store.getState().setCheckout(checkout('A'));store.getState().setReplacementOrderId('old-order','A');
 await store.persist.rehydrate();store.getState().bindUser('A');
 assert.equal(store.getState().checkout.orderId,'order');assert.equal(store.getState().replacementOrderId,'old-order');
});
test('legacy unowned state is discarded during migration',async()=>{
 storage.setItem('brewlite-cart-v3',JSON.stringify({version:0,state:{items:[item],checkout:checkout('A'),replacementOrderId:'old-order'}}));
 await store.persist.rehydrate();assert.equal(store.getState().checkout,null);assert.equal(store.getState().replacementOrderId,null);
});
test('an API response for an old token is discarded after account switching',async()=>{
 const oldFetch=globalThis.fetch;let resolve;
 globalThis.fetch=()=>new Promise(r=>{resolve=r;});
 try {
  storage.setItem('token','A');const pending=apiRequest('/auth/me');storage.setItem('token','B');
  resolve(new Response(JSON.stringify({user_id:'A'}),{status:200}));
  await assert.rejects(pending,e=>e.status===409);
 } finally {globalThis.fetch=oldFetch;}
});
test('switching accounts while a response body downloads also discards the old response',async()=>{
 const oldFetch=globalThis.fetch;let resolveBody;
 globalThis.fetch=async()=>({ok:true,json:()=>new Promise(r=>{resolveBody=r;})});
 try {
  storage.setItem('token','A');const pending=apiRequest('/auth/me');
  await Promise.resolve();storage.setItem('token','B');resolveBody({user_id:'A'});
  await assert.rejects(pending,e=>e.status===409);
 } finally {globalThis.fetch=oldFetch;}
});
