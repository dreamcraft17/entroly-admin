-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "operator_role" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_operator_id_idx" ON "admin_audit_logs"("operator_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_entity_id_idx" ON "admin_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
