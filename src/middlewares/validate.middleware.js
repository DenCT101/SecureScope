
//   Validate Middleware
//  Validates request body/params/query against a Zod schema before processing.
// Usage:


const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        status: "fail",
        message: "Validation failed",
        errors,
      });
    }

    req.body = result.data;
    next();
  };
};

module.exports = { validate };
