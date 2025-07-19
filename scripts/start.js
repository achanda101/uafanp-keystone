// scripts/start.js
const { spawn } = require('child_process');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
        console.log('Not using PostgreSQL, skipping database reset');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('🔄 Resetting PostgreSQL database...');

        // Drop all tables in public schema
        await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

        console.log('✅ Database reset completed');
    } catch (error) {
        console.error('❌ Database reset failed:', error.message);
        // Don't throw - let Keystone handle schema creation
    } finally {
        await client.end();
    }
}

function cleanupPrismaFiles() {
    console.log('🧹 Cleaning up old Prisma files...');

    const filesToDelete = [
        'schema.prisma',
        'prisma/schema.prisma',
        '.keystone/schema.prisma'
    ];

    const dirsToDelete = [
        '.keystone',
        'node_modules/.prisma',
        'prisma'
    ];

    for (const file of filesToDelete) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(`Deleted: ${file}`);
            }
        } catch (error) {
            console.log(`Could not delete ${file}:`, error.message);
        }
    }

    for (const dir of dirsToDelete) {
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`Deleted directory: ${dir}`);
            }
        } catch (error) {
            console.log(`Could not delete ${dir}:`, error.message);
        }
    }
}

function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${command} ${args.join(' ')}`);

        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, NODE_ENV: 'production' }
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });

        child.on('error', reject);
    });
}

async function start() {
    try {
        console.log('🌟 Starting fresh Keystone deployment...');
        console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
        console.log(`Node ENV: ${process.env.NODE_ENV}`);

        // Step 1: Clean up any old Prisma files
        cleanupPrismaFiles();

        // Step 2: Reset the database
        await resetDatabase();

        // Step 3: Start Keystone in dev mode (handles schema generation automatically)
        console.log('🎯 Starting Keystone in dev mode...');
        await runCommand('npx', [ 'keystone', 'dev' ]);

    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        process.exit(1);
    }
}

start();