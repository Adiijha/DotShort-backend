import mongoose from 'mongoose';
import dotenv from 'dotenv';

const urlSchema = new mongoose.Schema({
    longUrl: { 
        type: String, 
        required: true 
    },
    shortCode: { 
        type: String, 
        required: true, 
        unique: true 
    },
    shortUrl: { 
        type: String, 
        required: true 
    },
  });

export const Url = mongoose.model("Url", urlSchema);