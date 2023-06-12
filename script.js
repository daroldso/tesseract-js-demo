//Main js file:

//Store hooks and video sizes:
const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const demosSection = document.getElementById("demos");
const enableWebcamButton = document.getElementById("webcamButton");
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);
var vidWidth = 0;
var vidHeight = 0;
var xStart = 0;
var yStart = 0;

const captureSize = {
  w: 150,
  h: 30,
}; //pxels

//Creating canvas for OCR:
const c = document.createElement("canvas");
//const c = document.getElementById('canvas');
c.width = captureSize.w;
c.height = captureSize.h;
var click_pos = {
  x: 0,
  y: 0,
};

var mouse_pos = {
  x: 0,
  y: 0,
};

//Glob flag to indicate that detection is needed:
var Analyzef = false;

//----------Put video on canvas:
var canvas = document.getElementById("canvas");
var canvasBg = document.getElementById("canvasBg");
var context = canvas.getContext("2d");
var contextBg = canvasBg.getContext("2d");

//----Video capturing part:

//Render frame handler
function renderFrame() {
  // re-register callback
  requestAnimationFrame(renderFrame);

  // set internal canvas size to match HTML element size
  canvas.width = canvas.scrollWidth;
  canvas.height = canvas.scrollHeight;
  canvasBg.width = canvasBg.scrollWidth;
  canvasBg.height = canvasBg.scrollHeight;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    // scale and horizontally center the camera image
    var videoSize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };
    var canvasSize = {
      width: canvas.width,
      height: canvas.height,
    };
    var renderSize = calculateSize(videoSize, canvasSize);
    var xOffset = 0;
    var yOffset = 0;

    const {x, y} = getMarkCoord();

    contextBg.drawImage(
      video,
      xOffset,
      yOffset,
      renderSize.width,
      renderSize.height
    );

    let region = new Path2D();
    region.rect(x, y, captureSize.w, captureSize.h);
    // region.rect(40, 50, 100, 50);
    context.clip(region);

    context.drawImage(
      video,
      xOffset,
      yOffset,
      renderSize.width,
      renderSize.height
    );
  }
}

// Check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to activation button:
if (getUserMediaSupported()) {
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  //Enable click event:
  canvas.addEventListener("mousedown", Capture);

  // Hide the button once clicked.
  enableWebcamButton.classList.add("removed");

  // getUsermedia parameters to force video but not audio.
  const constraints = {
    video: true,
  };

  const panTiltZoomPermissionStatus = navigator.permissions.query({
    name: "camera",
    panTiltZoom: true,
  });

  // Stream video from VAR (for safari also)
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: "environment",
        pan: true,
        tilt: true,
        zoom: true,
      },
    })
    .then((stream) => {
      let $video = document.querySelector("video");
      $video.srcObject = stream;
      console.log('stream: ', stream);

      $video.onloadedmetadata = () => {
        vidWidth = $video.videoHeight;
        vidHeight = $video.videoWidth;

        //The start position of the video (from top left corner of the viewport)
        xStart = Math.floor((vw - vidWidth) / 2);
        yStart =
          Math.floor((vh - vidHeight) / 2) >= 0
            ? Math.floor((vh - vidHeight) / 2)
            : 0;
        console.log('xStart: ', xStart);
        console.log('yStart: ', yStart);

        $video.play();

        //Hook the detection on loading data to video element:
        $video.addEventListener("loadeddata", predictWebcamTF);
        renderFrame();
        // renderMark();
        clipFrame();
      };
    });
}

//-----Detection part:
//Async load of tessaract model
Init();

var children = [];
//Perform prediction based on webcam using Layer model model:
function predictWebcamTF() {
  // Now let's start classifying a frame in the stream.
  detectTFMOBILE(video).then(function () {
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcamTF);
  });
}

//Image detects object that matches the preset:
async function detectTFMOBILE(imgToPredict) {
  //Get next video frame:
  //Perform OCR:
  if (Analyzef) {
    const ctx = c.getContext("2d");

    var videoSize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };
    var canvasSize = {
      width: canvas.width,
      height: canvas.height,
    };
    var renderSize = calculateSize(videoSize, canvasSize);

    const minX = renderSize.width / 2 - captureSize.w / 2;
    const minY = renderSize.height - 100 - captureSize.h / 2;

    console.log("click_pos.x: ", click_pos.x);
    console.log("click_pos.y: ", click_pos.y);
    console.log("minX: ", minX);
    console.log("minY: ", minY);
    // alert('renderSize.width: ' + renderSize.width)
    // alert('renderSize.height: ' + renderSize.height)

    ctx.drawImage(
      canvas,
      // click_pos.x,
      // click_pos.y,
      minX,
      minY,
      // mouse_pos.x - captureSize.w / 2,
      // mouse_pos.y - captureSize.h / 2,
      captureSize.w,
      captureSize.h,
      0,
      0,
      captureSize.w,
      captureSize.h
    );
    // ctx.putImageData(preprocessImage(canvas), 0, 0);
    let tempMark = MarkAreaSimple(
      minX,
      minY,
      // mouse_pos.x - captureSize.w / 2,
      // mouse_pos.y - captureSize.h / 2,
      captureSize.w,
      captureSize.h
    );

    //Identify the digits using tesssaract:
    let res = await Recognize(c);

    tempMark.remove();

    MarkArea(minX, minY, captureSize.w, captureSize.h, res);
    Analyzef = false;

    //We can use the number to dial using whatsapp:
    /* if (res.length >= 10)
      window.location.href = 'sms:' + res.replaceAll('-', '');
    */
  }
}

//-----UI and Utils part:

//Mark the OCR area:
function MarkAreaSimple(minX, minY, width_, height_) {
  var highlighter = document.createElement("div");
  highlighter.setAttribute("class", "highlighter_s");

  highlighter.style =
    "left: " +
    minX +
    "px; " +
    "top: " +
    minY +
    "px; " +
    "width: " +
    width_ +
    "px; " +
    "height: " +
    height_ +
    "px;";

  liveView.appendChild(highlighter);
  children.push(highlighter);

  return highlighter;
}

//Helper function for marking OCR area helper:
function MarkArea(minX, minY, width_, height_, text) {
  var highlighter = document.createElement("div");
  highlighter.setAttribute("class", "highlighter");

  const matched = text.match(/\w{10,12}/);

  if (!matched) {
    return;
  }
  const matchedText = matched[0];

  console.log('text: ', text);

  highlighter.style =
    "left: " +
    minX +
    "px; " +
    "top: " +
    minY +
    "px; " +
    "width: " +
    width_ +
    "px; " +
    "height: " +
    height_ +
    "px;";
  highlighter.innerHTML = `<p>${matchedText}</p>`;

  liveView.appendChild(highlighter);

  children.push(highlighter);

  if (matchedText.length < 1) {
    liveView.removeChild(highlighter);
  } else {
    setTimeout(() => {
      liveView.removeChild(highlighter);
    }, 5000);
  }
}

//Streching image on canvas:
function calculateSize(srcSize, dstSize) {
  var srcRatio = srcSize.width / srcSize.height;
  var dstRatio = dstSize.width / dstSize.height;
  if (dstRatio > srcRatio) {
    return {
      width: dstSize.height * srcRatio,
      height: dstSize.height,
    };
  } else {
    return {
      width: dstSize.width,
      height: dstSize.width / srcRatio,
    };
  }
}

//Capture video on canvas the image:
function Capture(e) {
  console.log("Capture");
  var initialX = 0,
    initialY = 0;
  if (e.type === "touchstart") {
    initialX = e.touches[0].clientX;
    initialY = e.touches[0].clientY;
  } else {
    initialX = e.clientX;
    initialY = e.clientY;
  }

  let mouse = {
    x: 0,
    y: 0,
  };
  mouse.x = initialX;
  mouse.y = initialY;
  mouse_pos = mouse;
  console.log("mouse readings:", mouse);

  xy = getCursorPosition(canvas, e);

  console.log("click canvas readings:", xy);

  click_pos = {
    x: xy.x - captureSize.w / 2,
    y: xy.y - captureSize.h / 2,
  };

  console.log("click_pos: ", click_pos);

  //Update the global flag that this frame is for number detection:
  Analyzef = true;
}

//Get click on canvas:
function getCursorPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

function renderMark() {
  // alert('canvas.width: ' + canvas.width)
  // alert('canvas.height: ' + canvas.height)
  console.log("canvas.width: ", canvas.width);
  console.log("canvas.height: ", canvas.height);
  // var videoSize = {
  //   width: video.videoWidth,
  //   height: video.videoHeight,
  // };
  // var canvasSize = {
  //   width: canvas.width,
  //   height: canvas.height,
  // };
  // var renderSize = calculateSize(videoSize, canvasSize);

  // const minX = renderSize.width / 2 - captureSize.w / 2;
  // const minY = renderSize.height - 100 - captureSize.h / 2;
  const {x: minX, y: minY} = getMarkCoord();
  // const minX = canvas.width / 2 - captureSize.w / 2;
  // const minY = canvas.height - 100 - captureSize.h / 2;
  const width_ = captureSize.w;
  const height_ = captureSize.h;

  var highlighter = document.createElement("div");
  highlighter.setAttribute("class", "highlighter_static");

  highlighter.style =
    "left: " +
    minX +
    "px; " +
    "top: " +
    minY +
    "px; " +
    "width: " +
    width_ +
    "px; " +
    "height: " +
    height_ +
    "px;";

  liveView.appendChild(highlighter);
  children.push(highlighter);

  return highlighter;
}

function getMarkCoord() {
  var videoSize = {
    width: video.videoWidth,
    height: video.videoHeight,
  };
  var canvasSize = {
    width: canvas.width,
    height: canvas.height,
  };
  var renderSize = calculateSize(videoSize, canvasSize);

  const x = renderSize.width / 2 - captureSize.w / 2;
  const y = renderSize.height - 100 - captureSize.h / 2;

  return { x, y }
}
