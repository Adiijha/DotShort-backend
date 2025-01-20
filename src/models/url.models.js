import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

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
    qrCode: { 
        type: String, 
    },
    password: { 
        type: String, 
    },
    expiresAt: { 
        type: Date, 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
  });

  urlSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  };

export const Url = mongoose.model("Url", urlSchema);