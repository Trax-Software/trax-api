-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "budgetDaily" DOUBLE PRECISION,
ADD COLUMN     "budgetTotal" DOUBLE PRECISION,
ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "offerDeadline" TIMESTAMP(3),
ADD COLUMN     "offerType" TEXT,
ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "productOriginalPrice" DOUBLE PRECISION,
ADD COLUMN     "productPrice" DOUBLE PRECISION,
ADD COLUMN     "productUrl" TEXT,
ADD COLUMN     "productUsp" TEXT;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "credits" SET DEFAULT 10000;
