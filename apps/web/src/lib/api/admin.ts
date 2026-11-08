import {apiRequest} from './client';
import type {OrderDetail} from './orders';
export const ADMIN_CATEGORIES=['Classic Coffee','Cold & Brewed','Tea','Pastry & Dessert'];
export interface AdminProduct {productId:string;productName:string;description:string|null;basePrice:number;imageUrl:string|null;categories:string;stock:number;version:number;isActive:boolean;sizes:{size:'S'|'M'|'L';addPrice:number}[];toppingIds:string[]}
export interface ProductBody {productName:string;description:string;basePrice:number;imageUrl:string;categories:string;stock:number;isActive:boolean;sizes:{size:'S'|'M'|'L';addPrice:number}[];toppingIds:string[];version?:number}
export interface AdminOrder {order_id:string;order_code:string;status:string;total:number;created_at:string;customer_name:string;customer_phone:string|null;pickup_method:string;delivery_address:string|null;items:{product_name:string;quantity:number;size:string}[];payment:{status:string;method:string;provider:string}|null}
export const adminApi={
 products:(q:string,category:string,page:number,active:string)=>apiRequest<{items:AdminProduct[];total:number;page:number;page_size:number}>('/admin/products?'+new URLSearchParams({q,category,page:String(page),active})),
 toppings:()=>apiRequest<{topping_id:string;topping_name:string;price:string|number}[]>('/admin/toppings'),
 save:(body:ProductBody,id?:string)=>apiRequest('/admin/products'+(id?'/'+id:''),{method:id?'PUT':'POST',body:JSON.stringify(body)}),
 orders:(view:string,q:string,status:string,page:number)=>apiRequest<{items:AdminOrder[];total:number;page_size:number}>('/admin/orders?'+new URLSearchParams({view,q,status,page:String(page)})),
 order:(id:string)=>apiRequest<OrderDetail>('/admin/orders/'+id),
 advance:(id:string,status:string)=>apiRequest('/admin/orders/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})})
};
