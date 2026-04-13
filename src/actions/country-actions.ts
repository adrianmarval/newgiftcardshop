"use server";

import prisma from "@/lib/prisma";
import { authActionClient } from "@/lib/safe-action";
import z from "zod";

export const getActiveCountries = authActionClient.action(async () => {
  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return countries;
});

export const getCountryById = authActionClient.inputSchema(z.object({ id: z.string() })).action(async ({ parsedInput: { id } }) => {
  const country = await prisma.country.findUnique({
    where: { id },
  });
  return country;
});
