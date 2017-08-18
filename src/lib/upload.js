import mkdirp from 'mkdirp';
import mime from 'mime';
import cfg from '../config.json';
import S3fs from 's3fs';

const s3fs = new S3fs(cfg.s3.bucket+'/'+cfg.s3.prefix, cfg.s3);

function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

function generateFilename(extension) {
  let n;
  let i = 5;
  const tryName = () => {
    n = Math.random().toString(36).substring(2, 15)+'.'+extension;
    return s3fs.stat(n)
      .then(stat => (i-- > 0) ? tryName() : Promise.reject('Failed generate filename'))
      .catch( e => e.code==='NotFound' ? n : Promise.reject(e) )
  }
  return tryName();
}

export default function saveUploadedBase64( base64String ) {
  if (!base64String) return Promise.resolve(null);

  const decodedImg = decodeBase64Image(base64String);
  const imageBuffer = decodedImg.data;
  const type = decodedImg.type;
  const extension = mime.extension(type);
  let fileName;

  return generateFilename(extension)
    .then( genname => {
      fileName = genname;
      return s3fs.writeFile(fileName, imageBuffer, 'utf8')
    })
    .then( () => {
      return fileName;
    })
}

export function resolveUploadSrc(obj, props) {
  let imgsSrc = {};
  for (let p of props) {
     if (obj[p]) imgsSrc[p] = {src: '/static/'+obj[p]};
  }

  return {...obj, ...imgsSrc};
}
