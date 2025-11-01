// --- GLOBAL UI ELEMENTS ---
const boothBtn = document.getElementById("booth-btn");
const divisionBtn = document.getElementById("division-btn");
const boothToolDiv = document.getElementById("booth-tool");
const divisionToolDiv = document.getElementById("division-tool");
const form = document.getElementById("calculator-form");
const resultsContainer = document.getElementById("results-container");

let activeTool = "booth";

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  switchTool("booth");
});

// --- EVENT LISTENERS AND UI ---
boothBtn.addEventListener("click", (e) => {
  e.preventDefault();
  switchTool("booth");
});
divisionBtn.addEventListener("click", (e) => {
  e.preventDefault();
  switchTool("division");
});

function switchTool(tool) {
  activeTool = tool;
  clearResults();
  const activeClasses = ["!bg-card", "!text-highlight"];

  if (tool === "booth") {
    boothBtn.classList.add(...activeClasses);
    divisionBtn.classList.remove(...activeClasses);
    boothToolDiv.classList.remove("hidden");
    divisionToolDiv.classList.add("hidden");
  } else {
    divisionBtn.classList.add(...activeClasses);
    boothBtn.classList.remove(...activeClasses);
    divisionToolDiv.classList.remove("hidden");
    boothToolDiv.classList.add("hidden");
  }
}

function clearResults() {
  resultsContainer.classList.add("hidden");
  resultsContainer.innerHTML = "";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearResults();
  if (activeTool === "booth") {
    runBoothCalculation();
  } else {
    handleDivisionCalculation();
  }
});

// --- START: NEW BOOTH'S MULTIPLICATION LOGIC ---

function isNonNegativeIntegerString(str) {
  const n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && n >= 0;
}

function padOrTruncateBitArray(arr, length, truncate, signExtend) {
  let result = [];
  let padValue = signExtend ? arr[arr.length - 1] : 0;
  if (arr.length > length) {
    if (truncate) {
      for (let i = 0; i < length; i++) result[i] = arr[i];
      return result;
    }
    return 0;
  } else {
    result = [...arr];
    for (let i = arr.length; i < length; i++) result[i] = padValue;
  }
  return result;
}

function getTwosComplement(arr, length) {
  let padded = padOrTruncateBitArray(arr, length, false, true);
  let inverted = padded.map((bit) => (bit === 0 ? 1 : 0));
  let carry = 1;
  for (let i = 0; i < inverted.length; i++) {
    let sum = inverted[i] + carry;
    inverted[i] = sum % 2;
    carry = Math.floor(sum / 2);
    if (carry === 0) break;
  }
  return inverted;
}

function shiftLeft(arr) {
  return [0, ...arr];
}

function binaryStringAdd(strA, strB) {
  let sum = "",
    carry = 0;
  let len = Math.max(strA.length, strB.length);
  strA = strA.padStart(len, "0");
  strB = strB.padStart(len, "0");
  for (let i = len - 1; i >= 0; i--) {
    const bitA = parseInt(strA[i]),
      bitB = parseInt(strB[i]);
    const currentSum = bitA + bitB + carry;
    sum = (currentSum % 2) + sum;
    carry = Math.floor(currentSum / 2);
  }
  return carry > 0 ? carry + sum : sum;
}

function addShiftedPartialProduct(accumulator, partialProduct) {
  const accStr = accumulator.slice().reverse().join("");
  let ppStr = partialProduct.slice().reverse().join("");
  const shiftAmount = accumulator.length - partialProduct.length;
  ppStr = ppStr + "0".repeat(shiftAmount);
  const sumStr = binaryStringAdd(accStr, ppStr);
  return sumStr.split("").map(Number).reverse().slice(0, accumulator.length);
}

function binaryArrayToDecimalString(arr, fractionalBits) {
  let decimalValue = 0;
  const isNegative = arr[arr.length - 1] === 1;
  let workingArr = [...arr];

  if (isNegative) {
    let inverted = workingArr.map((b) => 1 - b);
    let carry = 1;
    for (let i = 0; i < inverted.length; i++) {
      let sum = inverted[i] + carry;
      inverted[i] = sum % 2;
      carry = Math.floor(sum / 2);
      if (carry === 0) break;
    }
    workingArr = inverted;
  }
  for (let i = 0; i < workingArr.length; i++) {
    if (workingArr[i] === 1) decimalValue += Math.pow(2, i - fractionalBits);
  }
  if (isNegative) decimalValue *= -1;

  let binaryStr = arr.slice().reverse().join("");
  if (fractionalBits > 0 && binaryStr.length > fractionalBits) {
    binaryStr =
      binaryStr.slice(0, -fractionalBits) +
      "." +
      binaryStr.slice(-fractionalBits);
  }
  return `${decimalValue} <span class="font-mono text-secondary-text">[${binaryStr}]</span>`;
}

function addOrdinalSuffix(i) {
  const j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) return i + "st";
  if (j == 2 && k != 12) return i + "nd";
  if (j == 3 && k != 13) return i + "rd";
  return i + "th";
}

function displayError(message) {
  resultsContainer.innerHTML = `<p class="text-error">${message}</p>`;
  resultsContainer.classList.remove("hidden");
}

function runBoothCalculation() {
  const multiplicandStr = document
    .getElementById("multiplicandBinaryInput")
    .value.replace(/\s/g, "");
  const multiplierStr = document
    .getElementById("multiplierBinaryInput")
    .value.replace(/\s/g, "");
  const wordLengthStr = document.getElementById("wordLengthInput").value;

  if (
    !/^[01.]+$/.test(multiplicandStr) ||
    (multiplicandStr.match(/\./g) || []).length > 1
  )
    return displayError("Invalid Multiplicand: Must be a valid binary number.");
  if (
    !/^[01.]+$/.test(multiplierStr) ||
    (multiplierStr.match(/\./g) || []).length > 1
  )
    return displayError("Invalid Multiplier: Must be a valid binary number.");
  if (
    parseFloat(multiplicandStr.replace(".", "")) === 0 ||
    parseFloat(multiplierStr.replace(".", "")) === 0
  )
    return displayError("Inputs must not be zero.");
  if (!isNonNegativeIntegerString(wordLengthStr) || wordLengthStr === "0")
    return displayError("Word Length must be a positive integer.");

  const wordLength = parseInt(wordLengthStr);
  const m_frac_bits = multiplicandStr.includes(".")
    ? multiplicandStr.split(".")[1].length
    : 0;
  const q_frac_bits = multiplierStr.includes(".")
    ? multiplierStr.split(".")[1].length
    : 0;

  let multiplicandBits = multiplicandStr
    .replace(".", "")
    .split("")
    .map(Number)
    .reverse();
  let multiplierBits = multiplierStr
    .replace(".", "")
    .split("")
    .map(Number)
    .reverse();

  if (
    multiplicandBits.length > wordLength ||
    multiplierBits.length > wordLength
  )
    return displayError(
      `Word length (${wordLength}) is too small for the given inputs.`
    );

  multiplicandBits = padOrTruncateBitArray(
    multiplicandBits,
    wordLength,
    false,
    true
  );
  multiplierBits = padOrTruncateBitArray(
    multiplierBits,
    wordLength,
    false,
    true
  );

  let extendedMultiplier = [0, ...multiplierBits];
  let boothEncoding = [];
  for (let i = 0; i < wordLength; i++)
    boothEncoding.push(extendedMultiplier[i] - extendedMultiplier[i + 1]);

  let evenBitMultiplier = [...extendedMultiplier];
  let evenBitAdded = false;
  if (wordLength % 2 !== 0) {
    evenBitMultiplier.push(evenBitMultiplier[evenBitMultiplier.length - 1]);
    evenBitAdded = true;
  }
  let bitPairBooth = [];
  for (let i = 0; i < evenBitMultiplier.length - 1; i++)
    bitPairBooth.push(evenBitMultiplier[i] - evenBitMultiplier[i + 1]);
  let bitPairRecoding = [];
  for (let i = 0; i < bitPairBooth.length; i += 2)
    bitPairRecoding.push(bitPairBooth[i] + 2 * bitPairBooth[i + 1]);

  const negMultiplicand = getTwosComplement(multiplicandBits, wordLength);
  const productLength = 2 * wordLength;

  let partialProducts = [];
  let accumulator = Array(productLength).fill(0);
  for (let i = 0; i < wordLength; i++) {
    let currentPartialProduct;
    if (boothEncoding[i] === 1) currentPartialProduct = [...multiplicandBits];
    else if (boothEncoding[i] === -1)
      currentPartialProduct = [...negMultiplicand];
    else continue;

    currentPartialProduct = padOrTruncateBitArray(
      currentPartialProduct,
      productLength - i,
      false,
      true
    );
    partialProducts.push({
      op: boothEncoding[i],
      bits: currentPartialProduct,
      shift: i,
    });
    accumulator = addShiftedPartialProduct(accumulator, currentPartialProduct);
  }
  const finalProduct = accumulator;

  let bitPairPartialProducts = [];
  let bpAccumulator = Array(productLength + 1).fill(0);
  const m_shifted = shiftLeft(multiplicandBits);
  const neg_m_shifted = getTwosComplement(m_shifted, m_shifted.length);

  for (let i = 0; i < bitPairRecoding.length; i++) {
    let currentPartialProduct;
    const op = bitPairRecoding[i];
    if (op === 0) continue;
    if (op === 1) currentPartialProduct = [...multiplicandBits];
    if (op === -1) currentPartialProduct = [...negMultiplicand];
    if (op === 2) currentPartialProduct = [...m_shifted];
    if (op === -2) currentPartialProduct = [...neg_m_shifted];

    currentPartialProduct = padOrTruncateBitArray(
      currentPartialProduct,
      bpAccumulator.length - 2 * i,
      false,
      true
    );
    bitPairPartialProducts.push({
      op: op,
      bits: currentPartialProduct,
      shift: 2 * i,
    });
    bpAccumulator = addShiftedPartialProduct(
      bpAccumulator,
      currentPartialProduct
    );
  }
  const bitPairFinalProduct = bpAccumulator;

  resultsContainer.innerHTML = generateResultHtml({
    multiplicandBits,
    multiplierBits,
    boothEncoding,
    partialProducts,
    finalProduct,
    q_frac_bits,
    m_frac_bits,
    wordLength,
    evenBitMultiplier,
    bitPairBooth,
    bitPairRecoding,
    evenBitAdded,
    bitPairPartialProducts,
    bitPairFinalProduct,
  });
  resultsContainer.classList.remove("hidden");
}

function generateResultHtml(data) {
  const {
    multiplicandBits,
    multiplierBits,
    boothEncoding,
    partialProducts,
    finalProduct,
    q_frac_bits,
    m_frac_bits,
    wordLength,
    bitPairRecoding,
    bitPairPartialProducts,
    bitPairFinalProduct,
    evenBitAdded,
    evenBitMultiplier,
  } = data;

  const totalFracBits = m_frac_bits + q_frac_bits;
  const tableClasses = "w-full text-sm font-mono whitespace-nowrap my-6";
  const tdClasses = "p-2 border border-border";
  const thClasses = `p-2 border border-border text-left text-secondary-text`;

  let html = `
                <div class="space-y-8">
                    <div>
                        <h2 class="text-xl sm:text-2xl font-bold text-highlight mb-4">Validation</h2>
                         <div class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 p-4 bg-background rounded-lg border border-border">
                            <div class="font-semibold text-secondary-text">Multiplicand:</div>
                            <div class="text-highlight">${binaryArrayToDecimalString(
                              multiplicandBits,
                              m_frac_bits
                            )}</div>

                            <div class="font-semibold text-secondary-text">Multiplier:</div>
                            <div class="text-highlight">${binaryArrayToDecimalString(
                              multiplierBits,
                              q_frac_bits
                            )}</div>

                            <div class="font-semibold text-secondary-text">Product:</div>
                            <div class="text-highlight">${binaryArrayToDecimalString(
                              finalProduct,
                              totalFracBits
                            )}</div>
                        </div>
                        ${
                          totalFracBits > 0
                            ? `<p class="text-sm text-secondary-text mt-4">The decimal point is at the ${addOrdinalSuffix(
                                totalFracBits
                              )} position from the right (${m_frac_bits} + ${q_frac_bits}).</p>`
                            : ""
                        }
                    </div>

                    <div class="space-y-4">
                        <h2 class="text-xl sm:text-2xl font-bold text-highlight">Booth's Algorithm (Radix-2)</h2>
                        <div class="overflow-x-auto">
                            <table class="${tableClasses}">
                                <thead><tr><th class="${thClasses}">Q<sub>i</sub></th><th class="${thClasses}">Q<sub>i-1</sub></th><th class="${thClasses}">Operation</th></tr></thead>
                                <tbody>
                                    <tr><td class="${tdClasses}">0</td><td class="${tdClasses}">0</td><td class="${tdClasses}">0 (No op)</td></tr>
                                    <tr><td class="${tdClasses}">0</td><td class="${tdClasses}">1</td><td class="${tdClasses}">+1 (Add M)</td></tr>
                                    <tr><td class="${tdClasses}">1</td><td class="${tdClasses}">0</td><td class="${tdClasses}">-1 (Sub M)</td></tr>
                                    <tr><td class="${tdClasses}">1</td><td class="${tdClasses}">1</td><td class="${tdClasses}">0 (No op)</td></tr>
                                </tbody>
                            </table>
                            <table class="${tableClasses}"><tbody>
                                <tr><td class="${tdClasses} text-right">Multiplier (Q):</td> ${multiplierBits
    .slice()
    .reverse()
    .map((b) => `<td class="${tdClasses}">${b}</td>`)
    .join(
      ""
    )} <td class="${tdClasses}"><span class="text-error">0</span></td></tr>
                                <tr><td class="${tdClasses} text-right">Recoded:</td> ${boothEncoding
    .slice()
    .reverse()
    .map((b) => `<td class="${tdClasses}">${b > 0 ? `+${b}` : b}</td>`)
    .join("")} <td class="p-2"></td></tr>
                            </tbody></table>
                        </div>
                        <h3 class="font-semibold text-lg text-highlight">Multiplication Steps</h3>
                        <div class="overflow-x-auto"><table class="${tableClasses}"><tbody>
                            <tr><td class="${tdClasses}">M =</td><td colspan="${
    2 * wordLength
  }" class="${tdClasses}">${multiplicandBits
    .slice()
    .reverse()
    .join("")}</td></tr>
                            ${partialProducts
                              .map(
                                (pp) =>
                                  `<tr><td class="${tdClasses}">Op: ${
                                    pp.op > 0 ? `+${pp.op}` : pp.op
                                  } (shift ${
                                    pp.shift
                                  })</td>${'<td class="p-2"></td>'.repeat(
                                    pp.shift
                                  )}${pp.bits
                                    .slice(0, 2 * wordLength - pp.shift)
                                    .reverse()
                                    .map(
                                      (b) =>
                                        `<td class="${tdClasses}">${b}</td>`
                                    )
                                    .join("")}</tr>`
                              )
                              .join("")}
                            <tr class="border-t-2 border-highlight"><td class="${tdClasses}">Product:</td>${finalProduct
    .slice()
    .reverse()
    .map((b, i) => {
      const isAfterPoint =
        finalProduct.length - 1 - i === totalFracBits - 1 && totalFracBits > 0;
      return `${
        isAfterPoint ? '<td class="p-2 border-none">.</td>' : ""
      }<td class="${tdClasses}">${b}</td>`;
    })
    .join("")}</tr>
                        </tbody></table></div>
                    </div>

                     <div class="space-y-4">
                        <h2 class="text-xl sm:text-2xl font-bold text-highlight">Bit-Pair Recoding (Radix-4)</h2>
                        <div class="overflow-x-auto">
                           <table class="${tableClasses}">
                                <thead><tr><th class="${thClasses}">(Q<sub>i+1</sub>,Q<sub>i</sub>,Q<sub>i-1</sub>)</th><th class="${thClasses}">Operation</th></tr></thead>
                                <tbody>
                                    <tr><td class="${tdClasses}">(0,0,0)/(1,1,1)</td><td class="${tdClasses}">0 &times; M</td></tr>
                                    <tr><td class="${tdClasses}">(0,0,1)/(0,1,0)</td><td class="${tdClasses}">+1 &times; M</td></tr>
                                    <tr><td class="${tdClasses}">(0,1,1)</td><td class="${tdClasses}">+2 &times; M</td></tr>
                                    <tr><td class="${tdClasses}">(1,0,0)</td><td class="${tdClasses}">-2 &times; M</td></tr>
                                    <tr><td class="${tdClasses}">(1,0,1)/(1,1,0)</td><td class="${tdClasses}">-1 &times; M</td></tr>
                                </tbody>
                            </table>
                            <table class="${tableClasses}"><tbody>
                                <tr><td class="${tdClasses} text-right">Multiplier (Q):</td>${(evenBitAdded
    ? [evenBitMultiplier[evenBitMultiplier.length - 1], ...multiplierBits]
    : multiplierBits
  )
    .slice()
    .reverse()
    .map(
      (b, i) =>
        `<td class="${tdClasses} ${
          evenBitAdded && i === 0 ? "text-error" : ""
        }">${b}</td>`
    )
    .join(
      ""
    )}<td class="${tdClasses}"><span class="text-error">0</span></td></tr>
                                <tr><td class="${tdClasses} text-right">Recoded:</td>${bitPairRecoding
    .slice()
    .reverse()
    .map(
      (b) => `<td colspan="2" class="${tdClasses}">${b > 0 ? `+${b}` : b}</td>`
    )
    .join("")}<td class="p-2"></td></tr>
                            </tbody></table>
                        </div>
                        <h3 class="font-semibold text-lg text-highlight">Multiplication Steps</h3>
                        <div class="overflow-x-auto"><table class="${tableClasses}"><tbody>
                            <tr><td class="${tdClasses}">M =</td><td colspan="${
    2 * wordLength + 1
  }" class="${tdClasses}">${multiplicandBits
    .slice()
    .reverse()
    .join("")}</td></tr>
                            ${bitPairPartialProducts
                              .map(
                                (pp) =>
                                  `<tr><td class="${tdClasses}">Op: ${
                                    pp.op > 0 ? `+${pp.op}` : pp.op
                                  } (shift ${
                                    pp.shift
                                  })</td>${'<td class="p-2"></td>'.repeat(
                                    pp.shift
                                  )}${pp.bits
                                    .slice(
                                      0,
                                      bitPairFinalProduct.length - pp.shift
                                    )
                                    .reverse()
                                    .map(
                                      (b) =>
                                        `<td class="${tdClasses}">${b}</td>`
                                    )
                                    .join("")}</tr>`
                              )
                              .join("")}
                            <tr class="border-t-2 border-highlight"><td class="${tdClasses}">Product:</td>${bitPairFinalProduct
    .slice()
    .reverse()
    .map((b, i) => {
      const isAfterPoint =
        bitPairFinalProduct.length - 1 - i === totalFracBits - 1 &&
        totalFracBits > 0;
      return `${
        isAfterPoint ? '<td class="p-2 border-none">.</td>' : ""
      }<td class="${tdClasses}">${b}</td>`;
    })
    .join("")}</tr>
                        </tbody></table></div>
                    </div>
                </div>`;
  return html;
}

// --- END: NEW BOOTH'S LOGIC ---

// --- DIVISION LOGIC ---
const padBinary = (str, len) => str.padStart(len, "0");
const addBinary = (bin1, bin2) => {
  let sum = "",
    carry = 0,
    len = Math.max(bin1.length, bin2.length);
  bin1 = padBinary(bin1, len);
  bin2 = padBinary(bin2, len);
  for (let i = len - 1; i >= 0; i--) {
    const bit1 = +bin1[i],
      bit2 = +bin2[i];
    const currentSum = bit1 + bit2 + carry;
    sum = (currentSum % 2) + sum;
    carry = currentSum > 1 ? 1 : 0;
  }
  return sum;
};
const twosComplement = (binStr) => {
  const inverted = binStr
    .split("")
    .map((b) => (b === "0" ? "1" : "0"))
    .join("");
  const one = "1".padStart(binStr.length, "0");
  return addBinary(inverted, one);
};

class RestoringDivision {
  solve(dividend, divisor) {
    let Q = dividend.toString(2);
    const M = divisor.toString(2);
    const n = Math.max(Q.length, M.length) || 1;
    Q = padBinary(Q, n);
    const M_padded = padBinary(M, n + 1);
    const M_neg = twosComplement(M_padded);
    let A = "0".repeat(n + 1);
    const steps = [];
    steps.push({
      cycle: "Init",
      action: "Initialization",
      A,
      Q,
      M: M_padded,
    });
    for (let i = 0; i < n; i++) {
      A = A.substring(1) + Q[0];
      Q = Q.substring(1) + "_";
      steps.push({ cycle: i + 1, action: "Shift Left", A, Q, M: M_padded });
      const A_before_subtract = A;
      A = addBinary(A, M_neg);
      steps.push({ cycle: i + 1, action: "A = A - M", A, Q, M: M_padded });
      if (A[0] === "1") {
        Q = Q.slice(0, -1) + "0";
        A = A_before_subtract;
        steps.push({
          cycle: i + 1,
          action: "A < 0, set Q₀=0 & Restore",
          A,
          Q,
          M: M_padded,
        });
      } else {
        Q = Q.slice(0, -1) + "1";
        steps.push({
          cycle: i + 1,
          action: "A ≥ 0, set Q₀=1",
          A,
          Q,
          M: M_padded,
        });
      }
    }
    const remainder = parseInt(A, 2);
    const quotient = parseInt(Q, 2);
    steps.push({
      cycle: "Final",
      action: `Result`,
      A: `${A} (${remainder})`,
      Q: `${Q} (${quotient})`,
      M: M_padded,
    });
    return { quotient, remainder, steps, type: "Restoring" };
  }
}

class NonRestoringDivision {
  solve(dividend, divisor) {
    let Q = dividend.toString(2);
    const M = divisor.toString(2);
    const n = Math.max(Q.length, M.length) || 1;
    Q = padBinary(Q, n);
    let M_padded = padBinary(M, n + 1);
    let M_neg = twosComplement(M_padded);
    let A = "0".repeat(n + 1);
    const steps = [];
    steps.push({
      cycle: "Init",
      action: "Initialization",
      A,
      Q,
      M: M_padded,
    });
    for (let i = 0; i < n; i++) {
      const a_is_negative = A[0] === "1";
      A = A.substring(1) + Q[0];
      Q = Q.substring(1) + "_";
      steps.push({
        cycle: i + 1,
        action: "Shift Left",
        A,
        Q,
        M: M_padded,
      });
      if (a_is_negative) {
        A = addBinary(A, M_padded);
        steps.push({
          cycle: i + 1,
          action: "A < 0, so A = A + M",
          A,
          Q,
          M: M_padded,
        });
      } else {
        A = addBinary(A, M_neg);
        steps.push({
          cycle: i + 1,
          action: "A ≥ 0, so A = A - M",
          A,
          Q,
          M: M_padded,
        });
      }
      if (A[0] === "1") {
        Q = Q.slice(0, -1) + "0";
        steps.push({
          cycle: i + 1,
          action: "A < 0, set Q₀=0",
          A,
          Q,
          M: M_padded,
        });
      } else {
        Q = Q.slice(0, -1) + "1";
        steps.push({
          cycle: i + 1,
          action: "A ≥ 0, set Q₀=1",
          A,
          Q,
          M: M_padded,
        });
      }
    }
    if (A[0] === "1") {
      A = addBinary(A, M_padded);
      steps.push({
        cycle: "Final",
        action: "A < 0, Remainder Correction (A=A+M)",
        A,
        Q,
        M: M_padded,
      });
    }
    const remainder = parseInt(A, 2);
    const quotient = parseInt(Q, 2);
    steps.push({
      cycle: "Result",
      action: `Final Result`,
      A: `${A} (${remainder})`,
      Q: `${Q} (${quotient})`,
      M: M_padded,
    });
    return { quotient, remainder, steps, type: "Non-Restoring" };
  }
}

function handleDivisionCalculation() {
  try {
    const dividend = parseInt(document.getElementById("dividend").value, 10);
    const divisor = parseInt(document.getElementById("divisor").value, 10);
    const algorithm = document.querySelector(
      'input[name="division-algorithm"]:checked'
    ).value;
    if (isNaN(dividend) || isNaN(divisor))
      throw new Error("Dividend and Divisor must be valid integers.");
    if (divisor === 0) throw new Error("Divisor cannot be zero.");
    if (dividend < 0 || divisor < 0)
      throw new Error("This implementation only supports unsigned integers.");
    let result;
    if (algorithm === "non-restoring") {
      const divider = new NonRestoringDivision();
      result = divider.solve(dividend, divisor);
    } else {
      const divider = new RestoringDivision();
      result = divider.solve(dividend, divisor);
    }
    displayDivisionResults(result);
  } catch (error) {
    displayError(error.message);
  }
}

function displayDivisionResults(result) {
  resultsContainer.classList.remove("hidden");
  let html = `
                <h2 class="text-xl sm:text-2xl font-bold text-center text-highlight mb-6">${
                  result.type
                } Division Results</h2>
                <div class="text-lg text-center font-sans text-primary-text">
                    Quotient: <span class="font-bold text-highlight">${
                      result.quotient
                    }</span>
                    <span class="mx-4 text-border">|</span>
                    Remainder: <span class="font-bold text-highlight">${
                      result.remainder
                    }</span>
                </div>
                <h3 class="font-semibold text-lg mb-4 text-highlight text-center mt-8">Step-by-Step Process</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm font-mono whitespace-nowrap">
                        <thead>
                            <tr>
                                <th class="py-3 px-4 text-secondary-text text-left">Cycle</th>
                                <th class="py-3 px-4 text-secondary-text text-left">Action</th>
                                <th class="py-3 px-4 text-secondary-text text-left">Divisor (M)</th>
                                <th class="py-3 px-4 text-secondary-text text-left">Accumulator (A)</th>
                                <th class="py-3 px-4 text-secondary-text text-left">Quotient (Q)</th>
                            </tr>
                        </thead>
                        <tbody>
                        ${result.steps
                          .map(
                            (step) => `
                            <tr>
                                <td class="p-3 border-t border-border">${
                                  step.cycle
                                }</td>
                                <td class="p-3 border-t border-border text-left">${
                                  step.action
                                }</td>
                                 <td class="p-3 border-t border-border">${
                                   step.M || ""
                                 }</td>
                                <td class="p-3 border-t border-border">${
                                  step.A
                                }</td>
                                <td class="p-3 border-t border-border">${step.Q.replace(
                                  /_/g,
                                  ""
                                )}</td>
                            </tr>
                        `
                          )
                          .join("")}
                        </tbody>
                    </table>
                </div>`;
  resultsContainer.innerHTML = html;
}
