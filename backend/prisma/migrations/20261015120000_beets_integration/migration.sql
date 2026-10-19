-- Integração com o Beets App: empresa ativa/inativa + código de cadastro ligado ao cliente do Beets e à empresa criada
ALTER TABLE "Company" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "InviteCode" ADD COLUMN "reference" TEXT;
ALTER TABLE "InviteCode" ADD COLUMN "companyId" INTEGER;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "InviteCode_reference_idx" ON "InviteCode"("reference");
