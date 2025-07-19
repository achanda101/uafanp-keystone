// scripts/start.js
const { spawn } = require('child_process');
const { Client } = require('pg');

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

function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${command} ${args.join(' ')}`);

        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true
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
        // Step 1: Reset the database
        await resetDatabase();

        // Step 2: Generate Prisma client
        console.log('🔧 Generating Prisma client...');
        await runCommand('npx', [ 'prisma', 'generate' ]);

        // Step 3: Push schema to database
        console.log('📊 Pushing schema to database...');
        await runCommand('npx', [ 'prisma', 'db', 'push', '--force-reset' ]);

        // Step 4: Start Keystone
        console.log('🎯 Starting Keystone...');
        await runCommand('npx', [ 'keystone', 'start' ]);

    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        process.exit(1);
    }
}

start();