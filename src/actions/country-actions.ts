"use server";

import prisma from "@/lib/prisma";

export async function getActiveCountries() {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return countries;
  } catch (error) {
    console.error("Error fetching active countries:", error);
    return [];
  }
}

export async function getCountryById(id: string) {
  try {
    const country = await prisma.country.findUnique({
      where: { id },
    });
    return country;
  } catch (error) {
    console.error("Error fetching country by id:", error);
    return null;
  }
}
