// scripts/init-db.js
const { PrismaClient } = require('@prisma/client');

async function initializeDatabase() {
    const prisma = new PrismaClient();

    try {
        console.log('Checking database connection...');

        // Test the connection and create tables if they don't exist
        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "HomePage" (
        "id" INTEGER NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL DEFAULT '',
        "heroHeading" TEXT NOT NULL DEFAULT '',
        "heroSubheading" TEXT NOT NULL DEFAULT '',
        "ctaButtonText" TEXT NOT NULL DEFAULT '',
        "ctaButtonUrl" TEXT NOT NULL DEFAULT '',
        "toPublish" TEXT DEFAULT 'draft',
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "GrantType" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL DEFAULT '',
        "slug" TEXT NOT NULL UNIQUE DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "grantAmount" TEXT NOT NULL DEFAULT '',
        "timeFrame" TEXT NOT NULL DEFAULT '',
        "availability" TEXT NOT NULL DEFAULT '',
        "commonUses" TEXT NOT NULL DEFAULT '',
        "badgeText" TEXT NOT NULL DEFAULT '',
        "badgeColor" TEXT DEFAULT 'grant-turmeric',
        "backgroundColor" TEXT DEFAULT 'light-sky',
        "grantPurpose" TEXT NOT NULL DEFAULT '',
        "isDisplayed" TEXT DEFAULT 'visible',
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Page" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL DEFAULT '',
        "slug" TEXT NOT NULL UNIQUE DEFAULT '',
        "heroHeading" TEXT NOT NULL DEFAULT '',
        "heroSubheading" TEXT NOT NULL DEFAULT '',
        "ctaButtonText" TEXT NOT NULL DEFAULT '',
        "ctaButtonUrl" TEXT NOT NULL DEFAULT '',
        "toPublish" TEXT DEFAULT 'draft',
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL DEFAULT '',
        "email" TEXT NOT NULL UNIQUE DEFAULT '',
        "password" TEXT NOT NULL,
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Tag" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL DEFAULT ''
      )
    `;

        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Post" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL DEFAULT '',
        "slug" TEXT NOT NULL UNIQUE DEFAULT '',
        "banner" TEXT,
        "content" TEXT NOT NULL DEFAULT '[{"type":"paragraph","children":[{"text":""}]}]',
        "author" TEXT,
        "toPublish" TEXT DEFAULT 'draft',
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("author") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `;

        // Insert default HomePage data if it doesn't exist
        const homePageExists = await prisma.homePage.findFirst();
        if (!homePageExists) {
            await prisma.homePage.create({
                data: {
                    id: 1,
                    title: 'Home Page',
                    heroHeading: 'Need support?\nApply for a grant today.',
                    heroSubheading: 'UAF A&P offers funding to women and non-binary activists, their families and their organisations in times of crisis',
                    ctaButtonText: 'Check Eligibility',
                    ctaButtonUrl: '/eligibility',
                    toPublish: 'published'
                }
            });
            console.log('✅ Default homepage created');
        }

        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };