class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal server error.";
  err.statusCode = err.statusCode || 500;

  if (err.name === "JsonWebTokenError") {
    err = new ErrorHandler("Json web token is invalid, Try again.", 401);
  }
  if (err.name === "TokenExpiredError") {
    err = new ErrorHandler("Json web token is expired, Try again.", 401);
  }
  if (err.name === "CastError") {
    err = new ErrorHandler(`Invalid ${err.path}`, 400);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    err = new ErrorHandler(`This ${field} is already registered.`, 400);
  }
  if (err.message === "Not allowed by CORS") {
    err = new ErrorHandler("Origin not allowed.", 403);
  }

  const errorMessage = err.errors
    ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
    : err.message;

  if (err.statusCode >= 500) {
    console.error(err);
  }

  return res.status(err.statusCode).json({
    success: false,
    message:
      err.statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error."
        : errorMessage,
  });
};

export default ErrorHandler;
