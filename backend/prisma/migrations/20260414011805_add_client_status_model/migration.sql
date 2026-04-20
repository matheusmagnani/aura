/*
  Warnings:

  - You are about to drop the column `status` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "status",
ADD COLUMN     "statusId" INTEGER;

-- CreateTable
CREATE TABLE "ClientStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6AA6C1',
    "companyId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientStatus_name_companyId_key" ON "ClientStatus"("name", "companyId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ClientStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientStatus" ADD CONSTRAINT "ClientStatus_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
