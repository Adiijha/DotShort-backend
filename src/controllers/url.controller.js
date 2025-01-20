import { asyncHandler } from "../utils/asyncHandler.js"; 
import { ApiError } from "../utils/ApiError.js";  
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../models/url.models.js";
import { User } from "../models/user.models.js";
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

    if (shortCode) {
      const existingUrl = await Url.findOne({ shortCode });
      if (existingUrl) {
        throw new ApiError(400, "Short code already in use");
      }
      finalShortCode = shortCode;
    } else {
      const hash = generateHash(longUrl);
      finalShortCode = hash.substring(0, 8);

      let existingUrl = await Url.findOne({ shortCode: finalShortCode });
      while (existingUrl) {
        finalShortCode = generateHash(longUrl + Date.now()).substring(0, 8);
        existingUrl = await Url.findOne({ shortCode: finalShortCode });
      }
    }

    const expiresAt = expireInHours
      ? new Date(Date.now() + expireInHours * 60 * 60 * 1000)
      : null;

    const shortUrl = `${req.protocol}://${req.get("host")}/${finalShortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUrlData = {
      longUrl,
      shortCode: finalShortCode,
      shortUrl,
      qrCode,
      password: hashedPassword,
      expiresAt,
    };

    if (req.user) {
      newUrlData.user = req.user._id; // Associate with logged-in user
    }

    const newUrl = new Url(newUrlData);
    await newUrl.save();

    if (req.user) {
      await User.findByIdAndUpdate(
        req.user._id,
        { $push: { links: newUrl._id } },
        { new: true }
      );
    }

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

    if (!url) {
      throw new ApiError(404, "URL not found");
    }

    // Check if the URL has expired, only if `expiresAt` is set
    if (url.expiresAt && url.expiresAt < Date.now()) {
      throw new ApiError(410, "This URL has expired");
    }

    // Redirect to the original URL if valid
    return res.redirect(url.longUrl);
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
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

const getUserLinks = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user._id : null;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Unauthorized: Please log in to view your links"));
  }

  try {
    console.log("Fetching user links for user ID:", userId); // Debugging log

    // Fetch the logged-in user's links array
    const user = await User.findById(userId).populate("links");

    if (!user) {
      console.error(`User with ID ${userId} not found`);
      return res.status(404).json(new ApiResponse(404, "User not found"));
    }

    console.log("User found:", user);

    if (!user.links || user.links.length === 0) {
      console.error(`No links found for user with ID ${userId}`);
      return res.status(404).json(
        new ApiResponse(404, "No shortened URLs found for the user", [])
      );
    }

    console.log("User links fetched successfully:", user.links);

    // Return the user's links
    res.status(200).json(
      new ApiResponse(200, "User's shortened URLs fetched successfully", {
        links: user.links,
      })
    );
  } catch (error) {
    console.error("Error fetching user links:", error.message); // Log the actual error
    throw new ApiError(500, "Internal server error");
  }
});

const deleteUrl = asyncHandler(async (req, res)=>{
  const {shortCode} = req.params;
  try{
    const url = await Url.findOneAndDelete({shortCode});
    if(!url){
      throw new ApiError(404, "URL not found");
    }
    res.json(new ApiResponse(200, "URL deleted successfully"));
  }
  catch(error){
    console.error("Error:", error);
    throw new ApiError(500, "Internal server error");
  }
})

export { shortenUrl, redirectToLongUrl, validatePasswordAndRedirect, getUserLinks, deleteUrl };