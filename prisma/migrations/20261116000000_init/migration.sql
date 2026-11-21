-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DISPATCHER', 'COURIER', 'CLIENT');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('NEW', 'CONFIRMED', 'PICKED_UP', 'AT_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT', 'POSTPONED', 'ON_HOLD', 'REFUSED', 'RETURNING', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentSource" AS ENUM ('MANUAL', 'SHEET', 'PORTAL');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('PARCEL', 'DOCUMENTS');

-- CreateEnum
CREATE TYPE "FeeMode" AS ENUM ('INVOICE', 'DEDUCT_FROM_COD');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_RECEIPT', 'CASH_NO_RECEIPT', 'CARD', 'TRANSFER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "fiscalCode" TEXT,
    "iban" TEXT,
    "feeMode" "FeeMode" NOT NULL DEFAULT 'INVOICE',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sheetId" TEXT,
    "sheetTab" TEXT,
    "columnMap" JSONB,
    "sheetSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRo" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "includedKg" INTEGER NOT NULL DEFAULT 5,
    "extraPerKg" INTEGER NOT NULL DEFAULT 400,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientZonePrice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "ClientZonePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNo" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" "ShipmentSource" NOT NULL DEFAULT 'MANUAL',
    "sheetRowKey" TEXT,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "senderAddress" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientLocality" TEXT,
    "zoneId" TEXT,
    "weightGrams" INTEGER NOT NULL DEFAULT 0,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "type" "ShipmentType" NOT NULL DEFAULT 'PARCEL',
    "contents" TEXT,
    "codAmount" INTEGER NOT NULL DEFAULT 0,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "feeOverridden" BOOLEAN NOT NULL DEFAULT false,
    "feeMode" "FeeMode" NOT NULL DEFAULT 'INVOICE',
    "desiredDate" DATE,
    "notes" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'NEW',
    "statusReason" TEXT,
    "courierId" TEXT,
    "sheetNeedsSync" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fromStatus" "ShipmentStatus",
    "toStatus" "ShipmentStatus" NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodPayment" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "receiptNo" TEXT,
    "courierId" TEXT,
    "recordedById" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheetSyncLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,

    CONSTRAINT "SheetSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_code_key" ON "Zone"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientZonePrice_clientId_zoneId_key" ON "ClientZonePrice"("clientId", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Locality_key_key" ON "Locality"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNo_key" ON "Shipment"("trackingNo");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_courierId_idx" ON "Shipment"("courierId");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_clientId_sheetRowKey_key" ON "Shipment"("clientId", "sheetRowKey");

-- CreateIndex
CREATE INDEX "StatusEvent_shipmentId_idx" ON "StatusEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "CodPayment_shipmentId_idx" ON "CodPayment"("shipmentId");

-- CreateIndex
CREATE INDEX "CodPayment_collectedAt_idx" ON "CodPayment"("collectedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientZonePrice" ADD CONSTRAINT "ClientZonePrice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientZonePrice" ADD CONSTRAINT "ClientZonePrice_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locality" ADD CONSTRAINT "Locality_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodPayment" ADD CONSTRAINT "CodPayment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodPayment" ADD CONSTRAINT "CodPayment_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodPayment" ADD CONSTRAINT "CodPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetSyncLog" ADD CONSTRAINT "SheetSyncLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

