const photoInput = document.getElementById("photoInput");
const previewImage = document.getElementById("previewImage");
const previewBox = document.getElementById("previewBox");

const compressBtn = document.getElementById("compressBtn");
const targetSize = document.getElementById("targetSize");
const customSize = document.getElementById("customSize");

const resultBox = document.getElementById("resultBox");
const resultText = document.getElementById("resultText");
const downloadBtn = document.getElementById("downloadBtn");
const statusMessage = document.getElementById("statusMessage");

let selectedImage = null;
let downloadURL = null;

photoInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/") ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Please select JPG, PNG or WebP image.");
        return;
    }

    if (file.size > 15 * 1024 * 1024) {
        alert("Image must be smaller than 15MB.");
        return;
    }

    selectedImage = file;

    const reader = new FileReader();

    reader.onload = function (e) {
        previewImage.src = e.target.result;
        previewBox.style.display = "block";
    };

    reader.readAsDataURL(file);

    resultBox.style.display = "none";
    statusMessage.textContent = "";
});

compressBtn.addEventListener("click", async function () {

    if (!selectedImage) {
        alert("Please upload a photo first!");
        return;
    }

    const custom = customSize.value.trim();

    const kb = custom ? Number(custom) : Number(targetSize.value);

    if (!Number.isFinite(kb) || kb <= 0 || kb > 10000) {
        alert("Enter a valid target size between 1 and 10000 KB.");
        return;
    }

    compressBtn.disabled = true;
    compressBtn.textContent = "Compressing...";
    resultBox.style.display = "none";
    statusMessage.textContent = "Please wait...";

    try {
        const img = new Image();

        const imageURL = URL.createObjectURL(selectedImage);

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageURL;
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = img.naturalWidth;
        let height = img.naturalHeight;

        const maxDimension = 3000;

        if (Math.max(width, height) > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        let blob = null;
        const targetBytes = kb * 1024;

        for (let resize = 0; resize < 12; resize++) {

            canvas.width = width;
            canvas.height = height;

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);

            for (let quality = 0.95; quality >= 0.10; quality -= 0.05) {

                blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, "image/jpeg", quality);
                });

                if (blob && blob.size <= targetBytes) {
                    break;
                }
            }

            if (blob && blob.size <= targetBytes) {
                break;
            }

            width = Math.max(1, Math.round(width * 0.85));
            height = Math.max(1, Math.round(height * 0.85));
        }

        URL.revokeObjectURL(imageURL);

        if (!blob || blob.size > targetBytes) {
            throw new Error("Target size could not be reached. Try a larger KB limit.");
        }

        if (downloadURL) {
            URL.revokeObjectURL(downloadURL);
        }

        downloadURL = URL.createObjectURL(blob);

        const finalKB = (blob.size / 1024).toFixed(2);
        const originalKB = (selectedImage.size / 1024).toFixed(2);

        resultText.textContent =
            `Original: ${originalKB} KB | Compressed: ${finalKB} KB`;

        resultBox.style.display = "block";
        statusMessage.textContent = "Photo compressed successfully!";

        downloadBtn.onclick = function () {
            const link = document.createElement("a");
            link.href = downloadURL;
            link.download = "compressed-photo.jpg";
            link.click();
        };

    } catch (error) {
        statusMessage.textContent = error.message;
    }

    compressBtn.disabled = false;
    compressBtn.textContent = "Compress Photo →";
});
