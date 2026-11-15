"use client";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import OrderDetail from "@/components/orders/order-detail";
function Content() {
  const { id } = useParams<{ id: string }>();
  return <OrderDetail key={id} id={id} />;
}
export default function Page() {
  return (
    <Suspense fallback={<p className="pt-32 text-center">Đang tải đơn...</p>}>
      <Content />
    </Suspense>
  );
}
