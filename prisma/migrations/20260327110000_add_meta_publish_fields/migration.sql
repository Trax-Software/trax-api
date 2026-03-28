-- AlterTable
ALTER TABLE "workspaces"
ADD COLUMN "metaAdAccountId" TEXT,
ADD COLUMN "metaPageId" TEXT;

-- AlterTable
ALTER TABLE "campaigns"
ADD COLUMN "metaCampaignId" TEXT,
ADD COLUMN "metaAdSetId" TEXT;
