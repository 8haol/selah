CREATE TABLE "org_modules" (
	"org_id" text NOT NULL,
	"module_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "org_modules_org_id_module_id_pk" PRIMARY KEY("org_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ws_decks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"setlist_id" text,
	"song_id" text,
	"theme_id" text NOT NULL,
	"deck" jsonb NOT NULL,
	"flows" jsonb NOT NULL,
	"titles" text[] DEFAULT '{}' NOT NULL,
	"generated_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ws_setlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"setlist_id" text NOT NULL,
	"song_id" text NOT NULL,
	"position" integer NOT NULL,
	"flow" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ws_setlists" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"service_date" date,
	"title" text NOT NULL,
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ws_songs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"title_en" text,
	"artist" text,
	"key" text,
	"sections" jsonb NOT NULL,
	"pinyin_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_flow" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'org' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"search_key" text DEFAULT '' NOT NULL,
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "org_modules" ADD CONSTRAINT "org_modules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_decks" ADD CONSTRAINT "ws_decks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_decks" ADD CONSTRAINT "ws_decks_setlist_id_ws_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "public"."ws_setlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_decks" ADD CONSTRAINT "ws_decks_song_id_ws_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."ws_songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_setlist_items" ADD CONSTRAINT "ws_setlist_items_setlist_id_ws_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "public"."ws_setlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_setlist_items" ADD CONSTRAINT "ws_setlist_items_song_id_ws_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."ws_songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_setlists" ADD CONSTRAINT "ws_setlists_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ws_songs" ADD CONSTRAINT "ws_songs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ws_decks_org_idx" ON "ws_decks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ws_decks_song_idx" ON "ws_decks" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "ws_songs_org_idx" ON "ws_songs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ws_songs_search_idx" ON "ws_songs" USING btree ("search_key");