-- AlterTable
ALTER TABLE "StatusEvent" ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "receivedBy" TEXT,
ADD COLUMN     "signaturePath" TEXT;

-- AlterTable
ALTER TABLE "CodPayment" ADD COLUMN     "handoverId" TEXT;

-- CreateTable
CREATE TABLE "CashHandover" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodPayment_handoverId_idx" ON "CodPayment"("handoverId");

-- AddForeignKey
ALTER TABLE "CodPayment" ADD CONSTRAINT "CodPayment_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "CashHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashHandover" ADD CONSTRAINT "CashHandover_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashHandover" ADD CONSTRAINT "CashHandover_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

