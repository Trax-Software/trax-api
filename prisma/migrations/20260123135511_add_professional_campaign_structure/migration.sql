-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'GENERATING_STRATEGY', 'WAITING_APPROVAL', 'GENERATING_ASSETS', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('META', 'GOOGLE', 'LINKEDIN');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "brandTone" TEXT,
ADD COLUMN     "keyBenefits" TEXT,
ADD COLUMN     "platform" "AdPlatform" NOT NULL DEFAULT 'META',
ADD COLUMN     "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "targetAudience" TEXT;

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "headline" TEXT,
    "primaryText" TEXT,
    "aiModel" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "facebookAdId" TEXT,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_creatives_campaignId_idx" ON "ad_creatives"("campaignId");

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
