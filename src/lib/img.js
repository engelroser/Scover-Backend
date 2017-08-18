import saveUploadedBase64 from './upload'

export default function saveImg(data, preValue = null) {
  if (Array.isArray(data)) {
    if (data.length == 0) return Promise.resolve(null);
    if (data[0].base64) {
      return saveUploadedBase64(data[0].base64)
    }
  }
  return Promise.resolve(preValue);
}
