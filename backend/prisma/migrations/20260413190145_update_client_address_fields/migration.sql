/*
  Warnings:

  - You are about to drop the column `document` on the `Client` table. All the data in the column will be lost.
  - Made the column `phone` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "document",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT,
ALTER COLUMN "phone" SET NOT NULL;
