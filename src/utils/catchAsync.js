/**
 * catchAsync
 * Wraps an async controller so you never have to write try/catch again.
 *
 * Usage:
 *   const getUsers = catchAsync(async (req, res) => { ... });
 */

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
