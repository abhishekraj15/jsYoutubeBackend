const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// const asyncHandler = () => {}
// const asyncHandler =(fu) => () => {}
// const asyncHandler = (fn) => async() => {}

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await function(req,res, next)
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
