"use server";

import prisma from "@/lib/prisma";

export async function getActiveBrands() {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return brands;
  } catch (error) {
    console.error("Error fetching active brands:", error);
    return [];
  }
}

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

export async function getBrandById(id: string) {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });
    return brand;
  } catch (error) {
    console.error("Error fetching brand by id:", error);
    return null;
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
