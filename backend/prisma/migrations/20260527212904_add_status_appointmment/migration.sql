/*
  Warnings:

  - You are about to drop the column `statusId` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Role` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_statusId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "idStatus" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "statusId",
ADD COLUMN     "idStatus" INTEGER;

-- AlterTable
ALTER TABLE "Proposal" DROP COLUMN "status",
ADD COLUMN     "idStatus" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "status",
ADD COLUMN     "idStatus" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_idStatus_fkey" FOREIGN KEY ("idStatus") REFERENCES "ClientStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
