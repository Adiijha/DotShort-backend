import { asyncHandler } from "../utils/asyncHandler.js"; 
import { ApiError } from "../utils/ApiError.js";  
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../models/url.models.js";
import dotenv from "dotenv";
import crypto from "crypto";
import QRCode from "qrcode";

dotenv.config();

const generateHash = (input) => {
    return crypto.createHash("sha256").update(input).digest("hex");
  };

// Endpoint to shorten a URL
const shortenUrl = asyncHandler(async (req, res) => {
  const { longUrl } = req.body;

  if (!longUrl) {
    throw new ApiError(400, "Long URL is required");
  }

  try {
    // Generate a unique short code
    const hash = generateHash(longUrl);

    // Truncate the hash to create the short code (first 8 characters)
    let shortCode = hash.substring(0, 8);

    // Check if the short code already exists in the database
    let existingUrl = await Url.findOne({ shortCode });
    
    // If it exists, regenerate the short code until it is unique
    while (existingUrl) {
      shortCode = generateHash(longUrl + Date.now()).substring(0, 8);  // Append timestamp to make it unique
      existingUrl = await Url.findOne({ shortCode });
    }

    const shortUrl = `${req.protocol}://${req.get("host")}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    // Save the mapping in the database
    const newUrl = new Url({ longUrl, shortCode, shortUrl, qrCode });
    await newUrl.save();

    res.json(new ApiResponse(200, "URL shortened successfully", { shortUrl, qrCode }));
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

export { shortenUrl, redirectToLongUrl };