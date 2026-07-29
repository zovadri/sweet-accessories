const CLOUD_NAME = "efjo1aed";
const UPLOAD_PRESET = "sweet-accessories";

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData, signal: controller.signal }
  );
  clearTimeout(timeout);

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}
