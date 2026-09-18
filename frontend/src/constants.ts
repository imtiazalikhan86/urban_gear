export const MINIMUM_PASSWORD_LENGTH = 12;

export const referenceCollections = [
  { title: "Bags & Backpacks", image: "/reference/catalog/bags-1.jpg" },
  { title: "Employee Gifting", image: "/reference/catalog/bags-2.jpg" },
  { title: "Corporate Kits", image: "/reference/catalog/corporate-gifting.png" },
];

export const referenceImageByCategory: Record<string, string> = {
  Bags: "/reference/catalog/bags-1.jpg",
  Drinkware: "/reference/catalog/bags-2.jpg",
};

/** Matches the backend slug rule in product.schemas.ts: lowercase alphanumerics joined by single hyphens. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function apiErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message;
  return message ?? fallback;
}
