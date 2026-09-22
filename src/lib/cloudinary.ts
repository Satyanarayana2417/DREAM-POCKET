const CLOUD_NAME = "dnpc9cgta";
const UPLOAD_PRESET = "expense manager";

export type UploadResult = { url: string; publicId: string };

/** Unsigned upload straight to Cloudinary. Only the returned URL is stored. */
export function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("folder", "expense-manager");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve({ url: data.secure_url as string, publicId: data.public_id as string });
        } else {
          reject(new Error(data?.error?.message ?? "Upload failed. Please try again."));
        }
      } catch {
        reject(new Error("Upload failed. Please try again."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading the receipt."));
    xhr.send(form);
  });
}

/** Mobile-friendly delivery: auto format, auto quality, capped width. */
export function optimizedImage(url: string, width = 600) {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
