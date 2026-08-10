-- CreateTable
CREATE TABLE "LandingEvent" (
    "id" SERIAL NOT NULL,
    "repSlug" TEXT,
    "type" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingEvent_repSlug_type_idx" ON "LandingEvent"("repSlug", "type");

-- CreateIndex
CREATE INDEX "LandingEvent_createdAt_idx" ON "LandingEvent"("createdAt");
