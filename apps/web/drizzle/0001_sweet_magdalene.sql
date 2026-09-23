ALTER TABLE "ws_setlist_items" ADD COLUMN "theme_id" text;--> statement-breakpoint
ALTER TABLE "ws_setlists" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ws_setlists" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "ws_setlist_items_setlist_idx" ON "ws_setlist_items" USING btree ("setlist_id");--> statement-breakpoint
CREATE INDEX "ws_setlists_org_idx" ON "ws_setlists" USING btree ("org_id");