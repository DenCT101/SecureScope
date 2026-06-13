const { z } = require("zod");

const createScanSchema = z.object({
    url: z.string().url("Invalid URL").trim().toLowerCase().nonempty("URL is required"),
    toolType: z.enum(["NIKTO", "NMAP", "SEMGREP"], "Invalid tool type"),
    geminiKey: z.string().optional(),
});

module.exports = { createScanSchema };