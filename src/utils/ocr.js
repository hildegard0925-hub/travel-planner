import { createWorker } from 'tesseract.js'

/*
  worker를 외부에서 취소할 수 있도록
  파일 전역 변수로 관리
*/

let workerInstance = null

export async function extractAmountsFromReceipt(
  imageSource,
  onProgress
) {
  workerInstance =
    await createWorker(['jpn', 'eng'], 1, {
      logger: (m) => {
        if (
          m.status === 'recognizing text' &&
          onProgress
        ) {
          onProgress(
            Math.round(m.progress * 100)
          )
        }
      },
    })

  try {
    const {
      data: { text },
    } = await workerInstance.recognize(
      imageSource
    )

    const amounts =
      parseAmounts(text)

    return { text, amounts }

  } finally {
    if (workerInstance) {
      await workerInstance.terminate()
      workerInstance = null
    }
  }
}

/*
  OCR 실행 중 취소
*/

export async function cancelOCR() {
  try {
    if (workerInstance) {
      await workerInstance.terminate()
      workerInstance = null
    }
  } catch (err) {
    console.error(err)
  }
}

/*
  금액 후보 추출
*/

function parseAmounts(text) {
  const found = new Set()

  const yenReg = /[¥￥]\s*([0-9０-９,，]+)/g
  let m

  while ((m = yenReg.exec(text)) !== null) {
    const n = toHalfWidth(m[1])
    const v = parseInt(
      n.replace(/[,，]/g, '')
    )

    if (v >= 100 && v <= 1000000)
      found.add(v)
  }

  const totalReg =
    /(?:合計|合計金額|税込|総合計|お会計|小計)[^\d０-９]*([0-9０-９,，]+)/g

  while ((m = totalReg.exec(text)) !== null) {
    const n = toHalfWidth(m[1])
    const v = parseInt(
      n.replace(/[,，]/g, '')
    )

    if (v >= 100 && v <= 1000000)
      found.add(v)
  }

  const numReg =
    /\b([1-9][0-9０-９]{2,5})\b/g

  while ((m = numReg.exec(text)) !== null) {
    const v = parseInt(
      toHalfWidth(m[1])
    )

    if (v >= 100 && v <= 100000)
      found.add(v)
  }

  return [...found]
    .sort((a, b) => b - a)
    .slice(0, 8)
}

function toHalfWidth(str) {
  return str.replace(
    /[０-９]/g,
    c =>
      String.fromCharCode(
        c.charCodeAt(0) - 0xFEE0
      )
  )
}