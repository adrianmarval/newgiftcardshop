import { Suspense } from "react";
import { SellerRegisterForm } from "@/components/auth/seller-register-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Seller | Solmaira Cards",
  description: "Create a seller account on Solmaira Cards",
};

export default function SellerRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SellerRegisterForm />
    </Suspense>
  );
}
