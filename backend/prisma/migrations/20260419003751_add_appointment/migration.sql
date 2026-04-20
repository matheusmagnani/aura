-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "collaboratorId" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
