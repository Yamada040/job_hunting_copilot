"use client";

import { useRouter } from "next/navigation";

import { useCreateCompany } from "@/lib/api/companies";
import { ROUTES } from "@/lib/constants/routes";
import { CompanyForm } from "./company-form";

export function NewCompanyForm() {
  const router = useRouter();
  const createCompany = useCreateCompany();

  return (
    <CompanyForm
      submitLabel="追加する"
      pending={createCompany.isPending}
      error={createCompany.error}
      onSubmit={({ preference, ...values }) =>
        createCompany.mutate(
          { ...values, preference: preference ?? undefined },
          { onSuccess: ({ company }) => router.push(ROUTES.COMPANY_DETAIL(company.id)) },
        )
      }
    />
  );
}
