/**
 * Prisma Client Initialization
 * Prisma 7 requires a driver adapter for direct DB connections.
 * We use @prisma/adapter-pg with the `pg` Pool for PostgreSQL.
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");//custom code for prisma 7
const { PrismaPg } = require("@prisma/adapter-pg");//translator betwwen the sql and prisma client
const { Pool } = require("pg");

const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('sslmode');

const pool = new Pool({ 
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false } // Required for Supabase external connections
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });
//write a log to tell if the connection is successful
console.log("Prisma client initialized");


module.exports = prisma;
