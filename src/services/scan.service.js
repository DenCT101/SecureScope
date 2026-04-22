/**
 * Record Service — Business logic for record operations
 */

const prisma = require("../config/db");

const createScan = async (userId, data) => {
  const scan = await prisma.scan.create({ data: { ...data, userId } });
  return scan;
};

const getAllScans = async (userId) => {
  const scans = await prisma.scan.findMany();
  return scans;
};

const getScanById = async (id) => {
  const scan = await prisma.scan.findUnique({ where: { id } });
  return scan;
};

module.exports = { createScan, getAllScans, getScanById };
