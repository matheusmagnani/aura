/*
  Warnings:

  - You are about to drop the column `repSlug` on the `LandingEvent` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LandingEvent_repSlug_type_idx";

-- AlterTable
ALTER TABLE "LandingEvent" DROP COLUMN "repSlug",
ADD COLUMN     "repId" INTEGER;

-- CreateTable
CREATE TABLE "LandingRep" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "ctaClicks" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingRep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingRep_slug_key" ON "LandingRep"("slug");

-- CreateIndex
CREATE INDEX "LandingEvent_repId_type_idx" ON "LandingEvent"("repId", "type");

-- AddForeignKey
ALTER TABLE "LandingEvent" ADD CONSTRAINT "LandingEvent_repId_fkey" FOREIGN KEY ("repId") REFERENCES "LandingRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: representante que já existia no reps.ts, pra o link /rafael-leony
-- continuar funcionando após o deploy. Idempotente (não sobrescreve se já existe).
INSERT INTO "LandingRep" ("slug", "name", "whatsapp", "updatedAt")
VALUES ('rafael-leony', 'Rafael Leony', '5531989053371', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
