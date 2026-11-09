
const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/Rqr9Yko3q/";

const FORM_ENDPOINT = "https://formspree.io/f/mjyyngzd";
const ALERT_THRESHOLD = 0.80;

let model = null;
let selectedImage = null;
let modelError = "";
let currentDebrisScore = 0;

const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");
const analyzeButton = document.getElementById("analyze");
const result = document.getElementById("result");
const scores = document.getElementById("scores");
const recommendation = document.getElementById("recommendation");

// Build the reporting interface without changing your HTML.
const alertPanel = document.createElement("section");
alertPanel.id = "drainsight-alert";
alertPanel.style.cssText = `
  display:none;
  background:#e4f6f0;
  border:2px solid #399a86;
  border-radius:16px;
  padding:24px;
  margin:24px 0;
  color:#15394a;
`;

alertPanel.innerHTML = `
  <h2>Potential Drain Blockage Detected</h2>
  <p id="alert-confidence"></p>
  <p>
    DrainSight identified visible debris in this photograph.
    Would you like to submit an observation for review?
  </p>

  <form id="drain-report-form">
    <label for="drain-location">
      <strong>Drain location</strong>
    </label>

    <input
      id="drain-location"
      name="location"
      type="text"
      placeholder="Street or nearby intersection"
      maxlength="200"
      required
      style="
        display:block;
        width:100%;
        padding:12px;
        margin:10px 0 16px;
        border:1px solid #9bbab3;
        border-radius:8px;
        font-size:16px;
      "
    >

    <label style="display:block;margin-bottom:16px;">
      <input
        id="report-confirmation"
        type="checkbox"
        required
      >
      I have reviewed the photo and location and want
      to submit this observation.
    </label>

    <button
      id="submit-drain-report"
      type="submit"
      style="
        background:#16475a;
        color:white;
        border:0;
        border-radius:9px;
        padding:14px 22px;
        font-size:16px;
        font-weight:bold;
        cursor:pointer;
      "
    >
      Submit Drain Report
    </button>
  </form>

  <p id="report-status" role="status"></p>

  <p style="font-size:13px;">
    Testing mode: Reports go to the DrainSight project team,
    not directly to the Town of Westport.
    AI confidence is not proof of a blockage.
    Never enter the roadway or approach an unsafe drain
    to take a photograph.
  </p>
`;

recommendation.insertAdjacentElement("afterend", alertPanel);

const reportForm = document.getElementById("drain-report-form");
const reportStatus = document.getElementById("report-status");
const reportButton = document.getElementById("submit-drain-report");

function hideAlert() {
  alertPanel.style.display = "none";
  currentDebrisScore = 0;
  reportForm.reset();
  reportStatus.textContent = "";
  reportButton.disabled = false;
  reportButton.textContent = "Submit Drain Report";
}

function showMessage(message) {
  result.classList.remove("hidden");
  result.textContent = message;
}

// Connect to the real AI model.
async function loadModel() {
  showMessage("Connecting to DrainSight AI...");

  try {
    if (typeof tmImage === "undefined") {
      throw new Error("Teachable Machine library did not load.");
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

// Handle photo uploads.
photoInput.addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showMessage("Please choose an image file.");
    return;
  }

  selectedImage = file;
  hideAlert();

  preview.onload = function() {
    showMessage("Photo ready. Click Analyze photograph.");
  };

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";

  scores.classList.add("hidden");
  recommendation.classList.add("hidden");
});

// Prepare a square image for the AI.
function prepareImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;

  const ctx = canvas.getContext("2d");

  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const size = Math.min(width, height);
  const x = (width - size) / 2;
  const y = (height - size) / 2;

  ctx.drawImage(
    image,
    x, y, size, size,
    0, 0, 224, 224
  );

  return canvas;
}

// Analyze the uploaded photograph.
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

  hideAlert();

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing...";

  showMessage("AI is analyzing your photograph...");

  try {
    const preparedImage = prepareImage(preview);
    const predictions = await model.predict(
      preparedImage,
      false
    );

    predictions.sort(
      (a, b) => b.probability - a.probability
    );

    const winner = predictions[0];

    // Display the classification safely.
    result.innerHTML = "<h3>Analysis Complete!</h3>";

    const classification = document.createElement("p");
    classification.textContent =
      "Most likely classification: " + winner.className;

    const confidence = document.createElement("p");
    confidence.textContent =
      "Model confidence: " +
      (winner.probability * 100).toFixed(1) + "%";

    result.append(classification, confidence);

    // Display all confidence scores.
    scores.innerHTML = "<h3>AI Confidence Scores</h3>";

    predictions.forEach(function(p) {
      const line = document.createElement("p");

      line.textContent =
        p.className + ": " +
        (p.probability * 100).toFixed(1) + "%";

      scores.appendChild(line);
    });

    scores.classList.remove("hidden");

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

    recommendation.innerHTML = "<h3>DrainSight Recommendation</h3>";

    const adviceText = document.createElement("p");
    adviceText.textContent = advice;
    recommendation.appendChild(adviceText);
    recommendation.classList.remove("hidden");

    // Check the Visible Debris score.
    const debrisPrediction = predictions.find(function(p) {
      return p.className.toLowerCase().includes("debris");
    });

    currentDebrisScore = debrisPrediction
      ? debrisPrediction.probability
      : 0;

    // Only offer reporting at 80% or higher.
    if (currentDebrisScore >= ALERT_THRESHOLD) {
      document.getElementById("alert-confidence").textContent =
        "Visible Debris confidence: " +
        (currentDebrisScore * 100).toFixed(1) + "%";

      alertPanel.style.display = "block";
    }

  } catch (error) {
    showMessage("Analysis error: " + error.message);

  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze photograph →";
  }
});

// Submit a confirmed report through Formspree.
reportForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (
    !selectedImage ||
    currentDebrisScore < ALERT_THRESHOLD
  ) {
    reportStatus.textContent =
      "Please analyze an eligible photo first.";
    return;
  }

  const location = document
    .getElementById("drain-location")
    .value.trim();

  if (!location) {
    reportStatus.textContent =
      "Please enter the drain location.";
    return;
  }

  reportButton.disabled = true;
  reportButton.textContent = "Sending...";
  reportStatus.textContent = "Sending report...";

  const formData = new FormData();

  formData.append(
    "subject",
    "DrainSight Test Alert - Visible Debris"
  );

  formData.append("location", location);

  formData.append(
    "classification",
    "Visible Debris"
  );

  formData.append(
    "confidence",
    (currentDebrisScore * 100).toFixed(1) + "%"
  );

  formData.append(
    "observed_at",
    new Date().toISOString()
  );

 
  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      body: formData,
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        "The reporting service did not accept the submission."
      );
    }

    reportStatus.textContent =
      "Report submitted! The DrainSight team can review it.";

    reportForm.style.display = "none";

} catch (error) {
  reportStatus.textContent =
    "Report error: " + error.message;

  reportButton.disabled = false;
  reportButton.textContent = "Submit Drain Report";
}
});

// Start the AI.
loadModel();
