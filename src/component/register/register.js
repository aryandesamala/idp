import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { useHistory } from "react-router-dom";
import "../register/register.css";

function Register() {
  const [faceData, setFaceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [message, setMessage] = useState("Initializing...");
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isReadyToRegister, setIsReadyToRegister] = useState(false);
  const [movementStep, setMovementStep] = useState("center");

  const videoRef = useRef();
  const canvasRef = useRef();
  const detectionRef = useRef(null);
  const movementTracker = useRef({ left: false, right: false, center: false });

  const history = useHistory();

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setLoading(false);
      setMessage("Click 'Start Camera' to begin.");
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    videoRef.current.play();
    detectFace();
    setMessage("Align your face and follow instructions.");
  };

  const detectFace = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);

      if (detections.length === 1) {
        setIsFaceDetected(true);
        detectionRef.current = detections[0];
        document.getElementById("overlay").style.border = "3px solid green";

        const nose = detections[0].landmarks.getNose();
        const noseX = nose[3].x;
        const frameCenter = video.width / 2;

        const offset = noseX - frameCenter;

        if (offset < -40) {
          movementTracker.current.left = true;
          setMovementStep("left");
        } else if (offset > 40) {
          movementTracker.current.right = true;
          setMovementStep("right");
        } else {
          movementTracker.current.center = true;
          setMovementStep("center");
        }

        if (
          movementTracker.current.left &&
          movementTracker.current.center &&
          movementTracker.current.right
        ) {
          setMessage("✅ Head movement verified! Ready to capture.");
        } else {
          setMessage("👀 Turn head left, center, and right for liveness.");
        }
      } else {
        setIsFaceDetected(false);
        detectionRef.current = null;
        document.getElementById("overlay").style.border = "3px solid red";
      }
    }, 300);
  };

  const handleCaptureClick = () => {
    if (!isFaceDetected || !detectionRef.current) {
      setMessage("❌ No face detected. Align your face properly.");
      return;
    }

    const { left, center, right } = movementTracker.current;
    if (!(left && center && right)) {
      setMessage("⚠️ Move head left, center, and right to prove liveness.");
      return;
    }

    if (faceData.length >= 3) {
      setMessage("✅ You have already captured 3 faces.");
      return;
    }

    const descriptor = Array.from(detectionRef.current.descriptor);
    const updatedData = [...faceData, descriptor];
    setFaceData(updatedData);

    const newCount = updatedData.length;
    setCaptureCount(newCount);
    setProgress((newCount / 3) * 100);
    setMessage(`✔️ Face ${newCount}/3 captured.`);

    if (newCount === 3) {
      setIsReadyToRegister(true);
      setMessage("🎉 All 3 live faces captured. Ready to register!");
    }
  };

  const handleRegister = () => {
    if (faceData.length === 3) {
      localStorage.setItem("faceData", JSON.stringify(faceData));
      alert("✅ Registration complete! Redirecting to login...");
      history.push("/login");
    } else {
      alert("❗ Please capture all 3 live face images first.");
    }
  };

  return (
    <div className="register-body">
      <div className="register-main">
        <h1>Register with Face</h1>
        <p style={{ color: "orange" }}>{message}</p>
        <p style={{ color: "deepskyblue" }}>
          Move Head: <strong>{movementStep.toUpperCase()}</strong>
        </p>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <>
            <div className="camera-wrapper">
              <video ref={videoRef} width="360" height="270" muted />
              <canvas ref={canvasRef} width="360" height="270" id="overlay" />
            </div>

            <button onClick={startCamera}>Start Camera</button>

            <button onClick={handleCaptureClick} disabled={!isFaceDetected}>
              Capture Face
            </button>

            <button
              onClick={handleRegister}
              disabled={!isReadyToRegister}
              style={{
                backgroundColor: isReadyToRegister ? "green" : "gray",
              }}
            >
              Register Face
            </button>

            <div className="progress-bar-wrapper">
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p>{captureCount}/3 live faces captured</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
