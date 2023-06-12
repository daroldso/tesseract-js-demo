//Initate Tesseract model wasm using worker:

//Glob variable OCR worker:
const worker = Tesseract.createWorker({
  logger: (m) => console.log(m.status),
});
Tesseract.setLogging(true);

//Initiate Tesseract worker:
async function Init() {
  //console.log('Initiate worker')
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  // OSD_ONLY: '0',
  // AUTO_OSD: '1',
  // AUTO_ONLY: '2',
  // AUTO: '3',
  // SINGLE_COLUMN: '4',
  // SINGLE_BLOCK_VERT_TEXT: '5',
  // SINGLE_BLOCK: '6',
  // SINGLE_LINE: '7',
  // SINGLE_WORD: '8',
  // CIRCLE_WORD: '9',
  // SINGLE_CHAR: '10',
  // SPARSE_TEXT: '11',
  // SPARSE_TEXT_OSD: '12',
  // RAW_LINE: '13',
  await worker.setParameters({ tessedit_pageseg_mode: "7" });

  //Enable start button:
  enableWebcamButton.classList.remove("invisible");
  enableWebcamButton.innerHTML = "Start camera";
  console.log("Finished loading tesseract");
}

//Function perform OCR on image
async function Recognize(image) {
  let result = await worker.recognize(image);
  console.log(result.data.text);
  console.log("Finished recognizing");
  return result.data.text;
}

//Function terminates the worker:
async function ShutDownWorker() {
  await worker.terminate();
}
