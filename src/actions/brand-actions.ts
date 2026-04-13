"use server";

import prisma from "@/lib/prisma";
import { authActionClient } from "@/lib/safe-action";
import z from "zod";

export const getActiveBrands = authActionClient.action(async () => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return brands;
});

export const getBrandById = authActionClient.inputSchema(z.object({ id: z.string() })).action(async ({ parsedInput: { id } }) => {
  const brand = await prisma.brand.findUnique({
    where: { id },
  });
  return brand;
});
