
const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/Rqr9Yko3q/";

let model = null;
let selectedImage = null;
let modelError = "";

const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");
const analyzeButton = document.getElementById("analyze");
const result = document.getElementById("result");
const scores = document.getElementById("scores");
const recommendation = document.getElementById("recommendation");

function showMessage(message) {
  result.classList.remove("hidden");
  result.textContent = message;
}

// Connect to the real AI model
async function loadModel() {
  showMessage("Connecting to DrainSight AI...");

  try {
    if (typeof tmImage === "undefined") {
      throw new Error(
        "Teachable Machine library did not load."
      );
    }

    model = await tmImage.load(
      MODEL_URL + "model.json",
      MODEL_URL + "metadata.json"
    );

    showMessage("AI connected! Upload a photo to begin.");

  } catch (error) {
    modelError = error.message;
    showMessage("AI connection error: " + modelError);
  }
}

// Handle photo uploads
photoInput.addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedImage = file;

  preview.onload = function() {
    showMessage("Photo ready. Click Analyze photograph.");
  };

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";

  scores.classList.add("hidden");
  recommendation.classList.add("hidden");
});

// Create a square image for the AI
function prepareImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;

  const ctx = canvas.getContext("2d");

  const width = image.naturalWidth;
  const height = image.naturalHeight;

  // Crop the center to make a square
  const size = Math.min(width, height);
  const x = (width - size) / 2;
  const y = (height - size) / 2;

  ctx.drawImage(
    image,
    x,
    y,
    size,
    size,
    0,
    0,
    224,
    224
  );

  return canvas;
}

// Analyze the uploaded photo
analyzeButton.addEventListener("click", async function() {

  if (!selectedImage) {
    showMessage("Please upload a photograph first.");
    return;
  }

  if (!model) {
    showMessage(
      "AI is not connected. " +
      (modelError || "Please wait for the AI to load.")
    );
    return;
  }

  if (!preview.complete || !preview.naturalWidth) {
    showMessage("Please wait for the photo to load.");
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing...";

  showMessage("AI is analyzing your photograph...");

  try {

    // Prepare the square image
    const preparedImage = prepareImage(preview);

    // Get REAL predictions from Teachable Machine
    const predictions = await model.predict(
      preparedImage,
      false
    );

    predictions.sort(
      (a, b) => b.probability - a.probability
    );

    const winner = predictions[0];

    // Display the classification
    result.innerHTML = `
      <h3>Analysis Complete!</h3>
      <p>Most likely classification:
      <strong>${winner.className}</strong></p>
      <p>Model confidence:
      <strong>${(winner.probability * 100).toFixed(1)}%</strong></p>
    `;

    // Display all three confidence scores
    scores.innerHTML = "<h3>AI Confidence Scores</h3>";

    predictions.forEach(function(p) {
      const line = document.createElement("p");

      line.textContent =
        p.className + ": " +
        (p.probability * 100).toFixed(1) + "%";

      scores.appendChild(line);
    });

    scores.classList.remove("hidden");

    // Give recommendations based on the prediction
    const label = winner.className.toLowerCase();

    let advice = "";

    if (label.includes("debris")) {
      advice =
        "Visible debris may be present. Consider reporting " +
        "the observation to the appropriate local department.";

    } else if (label.includes("clear")) {
      advice =
        "The grate appears clear in this photograph. " +
        "This does not confirm that the drain is functioning properly.";

    } else {
      advice =
        "The photo could not be confidently categorized as clear " +
        "or containing visible debris. Consider another photo.";
    }

    recommendation.innerHTML = `
      <h3>DrainSight Recommendation</h3>
      <p>${advice}</p>
    `;

    recommendation.classList.remove("hidden");

  } catch (error) {
    showMessage("Analysis error: " + error.message);

  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze photograph →";
  }
});

// Start the AI
loadModel();

