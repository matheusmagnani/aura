-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "deadlineDays" INTEGER,
ADD COLUMN     "deadlineType" TEXT,
ADD COLUMN     "remainingPaymentMethod" TEXT,
ADD COLUMN     "signalPaymentMethod" TEXT,
ADD COLUMN     "signalValue" DECIMAL(65,30);
