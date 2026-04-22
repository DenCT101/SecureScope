const { z } = require("zod");

const createScanSchema = z.object({
    url: z.string().url("Invalid URL").trim().toLowerCase().nonempty("URL is required"),
    toolType: z.enum(["SEMGREP", "NIKTO"], "Invalid tool type"),
});

module.exports = { createScanSchema };