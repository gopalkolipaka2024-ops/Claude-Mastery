CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"href" text,
	"tone" text DEFAULT 'brand' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_state" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"depth" smallint DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_depth" CHECK ("categories"."depth" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "deal_products" (
	"deal_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "deal_products_deal_id_product_id_pk" PRIMARY KEY("deal_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" date NOT NULL,
	"ends_at" date NOT NULL,
	CONSTRAINT "deals_order" CHECK ("deals"."ends_at" >= "deals"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "featured_products" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holiday_hours" (
	"date" date PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"open" text,
	"close" text
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"variant_id" integer PRIMARY KEY NOT NULL,
	"regular_cents" integer,
	"sale_cents" integer,
	"sale_starts_at" timestamp with time zone,
	"sale_ends_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_nonnegative" CHECK (coalesce("prices"."regular_cents", 0) >= 0 and coalesce("prices"."sale_cents", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand_id" integer,
	"category_id" integer NOT NULL,
	"description" text,
	"abv" numeric(4, 1),
	"country" text,
	"region" text,
	"varietal" text,
	"active" boolean DEFAULT true NOT NULL,
	"rank" integer DEFAULT 100000 NOT NULL,
	"game_day" boolean DEFAULT false NOT NULL,
	"art" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"from_slug" text PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"variant_id" integer PRIMARY KEY NOT NULL,
	"quantity" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_hours" (
	"dow" smallint PRIMARY KEY NOT NULL,
	"open" text,
	"close" text,
	CONSTRAINT "store_hours_dow" CHECK ("store_hours"."dow" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"items_seen" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"deactivated" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" text NOT NULL,
	"upc" text,
	"pack" text,
	"volume" text,
	"position" smallint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_redirects" ADD CONSTRAINT "slug_redirects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_parent_slug" ON "categories" USING btree (coalesce("parent_id", 0),"slug");--> statement-breakpoint
CREATE INDEX "deals_window" ON "deals" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "images_product" ON "images" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "prices_regular" ON "prices" USING btree ("regular_cents");--> statement-breakpoint
CREATE INDEX "products_category" ON "products" USING btree ("category_id") WHERE "products"."active";--> statement-breakpoint
CREATE INDEX "products_brand" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_rank" ON "products" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_created" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_country" ON "products" USING btree ("country");--> statement-breakpoint
CREATE INDEX "products_varietal" ON "products" USING btree ("varietal");--> statement-breakpoint
CREATE INDEX "stock_quantity" ON "stock" USING btree ("quantity");--> statement-breakpoint
CREATE INDEX "sync_runs_started" ON "sync_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "variants_product" ON "variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variants_upc" ON "variants" USING btree ("upc");--> statement-breakpoint
CREATE INDEX "variants_pack" ON "variants" USING btree ("pack");--> statement-breakpoint
CREATE INDEX "variants_volume" ON "variants" USING btree ("volume");