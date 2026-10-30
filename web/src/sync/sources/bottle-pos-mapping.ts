/*
  How to read a Bottle POS item export. Column names are matched case-insensitively.
  TODO(owner): confirm against a real export; add any column names it uses.
*/
export const COLUMN_ALIASES: Record<string, string[]> = {
  sku: ["sku", "item id", "item number", "item no", "item", "plu", "id"],
  upc: ["upc", "barcode", "upc code", "ean"],
  name: ["name", "item name", "description", "item description", "product", "product name"],
  brand: ["brand", "vendor", "manufacturer", "supplier"],
  department: ["department", "dept"],
  category: ["category", "sub department", "subcategory", "type", "class"],
  pack: ["pack", "pack size", "units per pack"],
  size: ["size", "volume", "unit size"],
  price: ["price", "retail", "retail price", "regular price", "price 1"],
  salePrice: ["sale price", "promo price", "special price"],
  saleStart: ["sale start", "promo start", "start date"],
  saleEnd: ["sale end", "promo end", "end date"],
  quantity: ["qty", "quantity", "on hand", "qty on hand", "quantity on hand", "stock"],
  active: ["active", "status", "enabled"],
};

/** POS category (lowercase) → [site department, site aisle]. Unlisted categories are reported by the sync. */
export const CATEGORY_MAP: Record<string, [string, string]> = {
  "light beer": ["Beer & Seltzers", "Light beer"],
  "domestic beer": ["Beer & Seltzers", "Domestic lager"],
  "imported beer": ["Beer & Seltzers", "Imported"],
  "craft beer": ["Beer & Seltzers", "Craft and seasonal"],
  "seltzer": ["Beer & Seltzers", "Seltzers, ciders and cocktails"],
  "hard seltzer": ["Beer & Seltzers", "Seltzers, ciders and cocktails"],
  "red wine": ["Wine", "Red"],
  "white wine": ["Wine", "White"],
  "sparkling wine": ["Wine", "Sparkling"],
  "vodka": ["Spirits", "Vodka"],
  "whiskey": ["Spirits", "Whiskey and bourbon"],
  "tequila": ["Spirits", "Tequila and mezcal"],
  "rum": ["Spirits", "Rum"],
  "soda": ["Soft Drinks & Water", "Soda"],
  "water": ["Soft Drinks & Water", "Water, seltzer and ice"],
};
