import { asyncHandler } from "../utils/asyncHandler.js"; 
import { ApiError } from "../utils/ApiError.js";  
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../models/url.models.js";
import dotenv from "dotenv";
import crypto from "crypto";
import QRCode from "qrcode";
import bcrypt from "bcrypt";

dotenv.config();

const generateHash = (input) => {
    return crypto.createHash("sha256").update(input).digest("hex");
  };

// Endpoint to shorten a URL
const shortenUrl = asyncHandler(async (req, res) => {
  const { longUrl, shortCode, password, expireInHours } = req.body;

  if (!longUrl) {
    throw new ApiError(400, "Long URL is required");
  }

  try {
    let finalShortCode;

    // Handle custom short code if provided
    if (shortCode) {
      const existingUrl = await Url.findOne({ shortCode });
      if (existingUrl) {
        throw new ApiError(400, "Short code already in use");
      }
      finalShortCode = shortCode;
    } else {
      // Generate a unique short code if not provided
      const hash = generateHash(longUrl);
      finalShortCode = hash.substring(0, 8);

      // Ensure the short code is unique
      let existingUrl = await Url.findOne({ shortCode: finalShortCode });
      while (existingUrl) {
        finalShortCode = generateHash(longUrl + Date.now()).substring(0, 8); // Append timestamp
        existingUrl = await Url.findOne({ shortCode: finalShortCode });
      }
    }

    // Calculate expiration time if specified
    const expiresAt = expireInHours
      ? new Date(Date.now() + expireInHours * 60 * 60 * 1000)
      : null;

    // Create the short URL and QR code
    const shortUrl = `${req.protocol}://${req.get("host")}/${finalShortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    // Hash the password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Save the URL mapping in the database
    const newUrl = new Url({
      longUrl,
      shortCode: finalShortCode,
      shortUrl,
      qrCode,
      password: hashedPassword,
      expiresAt,
    });
    await newUrl.save();

    const responseMessage = password
      ? "Password-protected URL created successfully"
      : shortCode
      ? "Custom URL created successfully"
      : "URL shortened successfully";

    res.json(
      new ApiResponse(201, responseMessage, {
        shortUrl,
        qrCode,
        expiresAt,
      })
    );
  } catch (error) {
    console.error("Error:", error);
    throw new ApiError(500, "Internal server error");
  }
});

// Endpoint to redirect a short URL to the original URL
const redirectToLongUrl = asyncHandler(async (req, res) => {
    const { shortCode } = req.params;
  
    try {
      const url = await Url.findOne({ shortCode });
  
      if (url) {
        return res.redirect(url.longUrl);
      }
  
      throw new ApiError(404, "URL not found");
    } catch (error) {
      console.error("Error:", error);
        throw new ApiError(500, "Internal server error");
    }
});


const validatePasswordAndRedirect = asyncHandler(async (req, res) => {
  const { shortCode, password } = req.body;

  if (!shortCode || !password) {
    throw new ApiError(400, "Short code and password are required");
  }

  const urlEntry = await Url.findOne({ shortCode });

  if (!urlEntry) {
    throw new ApiError(404, "URL not found");
  }

  if (!urlEntry.password) {
    throw new ApiError(400, "This URL is not password-protected");
  }

  const isMatch = await bcrypt.compare(password, urlEntry.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid password");
  }

  res.json(
    new ApiResponse(200, "Password validated successfully", {
      longUrl: urlEntry.longUrl,
    })
  );
});

export { shortenUrl, redirectToLongUrl, validatePasswordAndRedirect };