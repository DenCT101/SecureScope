/**
 * Scan Service — Business logic for scan operations.
 * No user association in local-first mode.
 */

const prisma = require("../config/db");

const createScan = async (data) => {
  // data contains: { url, toolType, geminiKey? }
  const scan = await prisma.scan.create({ data });
  return scan;
};

const getAllScans = async () => {
  const scans = await prisma.scan.findMany({
    include: {
      vulnerabilities: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  return scans;
};

const getScanById = async (id) => {
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: {
      vulnerabilities: true
    }
  });
  return scan;
};

module.exports = { createScan, getAllScans, getScanById };
