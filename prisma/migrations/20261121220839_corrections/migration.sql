-- CreateEnum
CREATE TYPE "ChangeKind" AS ENUM ('DETAILS', 'PAYMENT_EDITED', 'PAYMENT_DELETED');

-- AlterTable
ALTER TABLE "StatusEvent" ADD COLUMN     "undoReason" TEXT,
ADD COLUMN     "undoneAt" TIMESTAMP(3),
ADD COLUMN     "undoneById" TEXT;

-- CreateTable
CREATE TABLE "ShipmentChange" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "kind" "ChangeKind" NOT NULL,
    "data" JSONB NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentChange_shipmentId_idx" ON "ShipmentChange"("shipmentId");

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_undoneById_fkey" FOREIGN KEY ("undoneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentChange" ADD CONSTRAINT "ShipmentChange_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentChange" ADD CONSTRAINT "ShipmentChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
