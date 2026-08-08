"""
Cloudinary media storage utilities.
Handles uploading and deleting audio files and other media.
"""

import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary from env vars
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)


def upload_audio(file_obj, filename: str, meeting_id: str) -> dict:
    """
    Upload an audio file to Cloudinary via streaming.
    
    Args:
        file_obj: A file-like object (e.g., FastAPI's UploadFile.file).
        filename: Original filename (for reference).
        meeting_id: Used as the public_id prefix for organization.
    
    Returns:
        dict with 'url' (secure_url) and 'public_id'.
    """
    # Get file extension for resource type detection
    _, ext = os.path.splitext(filename)
    public_id = f"meeting_audio/{meeting_id}"
    
    result = cloudinary.uploader.upload_large(
        file_obj,
        public_id=public_id,
        resource_type="video",  # Cloudinary uses 'video' for audio files
        overwrite=True,
        folder="meeting-graphrag",
    )
    
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
    }


def delete_audio(public_id: str) -> bool:
    """
    Delete an audio file from Cloudinary.
    
    Args:
        public_id: The Cloudinary public_id of the asset.
    
    Returns:
        True if deleted successfully.
    """
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="video")
        return result.get("result") == "ok"
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        return False
