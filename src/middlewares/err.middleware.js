import { ApiError } from "../utils/ApiError.js";

// Global error-handling middleware
export const errorHandler = (err, req, res, next) => {
  // Check if the error is an instance of ApiError
  if (err instanceof ApiError) {
    const { statusCode, message, errors, stack } = err;

    // Send JSON response with ApiError structure
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors || [],
      stack: process.env.NODE_ENV === "production" ? undefined : stack,
    });
  }

  // Fallback for generic errors
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};