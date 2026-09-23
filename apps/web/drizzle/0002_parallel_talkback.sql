ALTER TABLE "ws_setlists" ADD COLUMN "kind" text DEFAULT 'service' NOT NULL;--> statement-breakpoint
CREATE INDEX "ws_setlists_org_kind_idx" ON "ws_setlists" USING btree ("org_id","kind");